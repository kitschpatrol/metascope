/* eslint-disable unicorn/prefer-https */
/* eslint-disable ts/dot-notation */
/* eslint-disable ts/naming-convention */

import type { RemoteDocument } from 'jsonld/jsonld-spec'
import is from '@sindresorhus/is'
import fs from 'node:fs/promises'
import path from 'node:path'
import { glob } from 'tinyglobby'
import { log } from '../src/lib/log.js'
import { clearCache, customLoader, toCacheKey } from './jsonld-loader.js'
import {
	downloadUrlToFile,
	enforceArray,
	extractAllStringValuesFromPojo,
	getColumnMapFromCsvUrl,
	mutateFile,
	runPrettierOnFile,
} from './utilities'

const COMMA_OR_SLASH_REGEX = /[,\/]/v

async function getAllContextUrlsFromFixtures(): Promise<Promise<string[]>> {
	const MANDATORY_URLS = new Set([
		'http://schema.org',
		'https://doi.org/10.5063/SCHEMA/CODEMETA-1.0',
		'https://doi.org/10.5063/schema/codemeta-2.0',
		'https://doi.org/10.5063/SCHEMA/CODEMETA-2.0',
		'https://raw.githubusercontent.com/codemeta/codemeta/0.1-alpha/codemeta.jsonld',
		'https://raw.githubusercontent.com/codemeta/codemeta/2.0/codemeta.jsonld',
		'https://raw.githubusercontent.com/codemeta/codemeta/master/codemeta.jsonld',
		'https://raw.githubusercontent.com/jantman/repostatus.org/master/badges/latest/ontology.jsonld',
		'https://raw.githubusercontent.com/mbjones/codemeta/master/codemeta.jsonld',
		'https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/13.0/schemaorgcontext.jsonld',
		'https://schema.org',
		'https://w3id.org/codemeta/3.0',
		'https://w3id.org/codemeta/3.1',
		'https://w3id.org/software-iodata',
		'https://w3id.org/software-types',
	])

	const BAD_URLS = new Set([
		'http://purl.org/dc/terms/relation',
		'https://gitlab.ebrains.eu/lauramble/servicemeta/-/raw/main/data/contexts/servicemeta.jsonld',
	])

	const codemetaFiles = await glob('./test/fixtures/codemeta/*.json', {
		absolute: true,
		onlyFiles: true,
	})

	const urlAccumulator = new Set<string>(MANDATORY_URLS)
	for (const filePath of codemetaFiles) {
		const rawData = await fs.readFile(filePath, 'utf8')

		const document = JSON.parse(rawData) as Record<string, unknown>

		const urls = enforceArray(extractAllStringValuesFromPojo(document['@context'])).filter(
			(value) => value.startsWith('http://') || value.startsWith('https://'),
		)

		for (const url of urls) {
			if (!BAD_URLS.has(url)) {
				urlAccumulator.add(url)
			}
		}
	}

	return [...urlAccumulator]
}

async function updateContextCache(destinationDirectory: string, force = false): Promise<string> {
	await fs.mkdir(destinationDirectory, { recursive: true })
	const destinationFilePath = path.join(destinationDirectory, 'context-cache.json')

	if (force) {
		// Clear existing
		await fs.writeFile(destinationFilePath, '{}', 'utf8')

		// Clear memory cache in loader
		clearCache()
	}

	// Get all context URLs
	const contextUrls = await getAllContextUrlsFromFixtures()
	const cacheObject: Record<string, RemoteDocument> = {}
	for (const url of contextUrls) {
		log.debug(`Loading URL: ${url}`)
		const result = await customLoader(url)
		cacheObject[toCacheKey(url)] = result
	}

	await fs.writeFile(destinationFilePath, JSON.stringify(cacheObject, undefined, 2), 'utf8')
	return destinationFilePath
}

function framingContextMutation(content: string): string {
	// eslint-disable-next-line ts/no-explicit-any
	const json = JSON.parse(content) as { '@context': Record<string, any> }
	const context = json['@context']

	// 1. Add @vocab
	context['@vocab'] = 'http://schema.org/'

	// 2. Iterate over all keys in the context to clean them up
	for (const key of Object.keys(context)) {
		// Remove aliases specific to CodeMeta
		if (key === 'type' || key === 'id') {
			// eslint-disable-next-line ts/no-dynamic-delete
			delete context[key]
			continue
		}

		// Handle nested field definitions
		// eslint-disable-next-line ts/no-unsafe-assignment
		const value = context[key]

		if (typeof value === 'object' && value !== null) {
			// Strip @container (conflicts with repeated-triples) and @type (conflicts with IDs)
			// eslint-disable-next-line ts/no-unsafe-member-access
			delete value['@container']
			// eslint-disable-next-line ts/no-unsafe-member-access
			delete value['@type']
		}
	}

	return JSON.stringify(json, undefined, 2)
}

function softwareTypesTermsMutation(content: string): string {
	// eslint-disable-next-line ts/no-explicit-any
	const json = JSON.parse(content) as { '@context': Record<string, any> }

	const newJson = {
		...json,
		'@context': {
			...json['@context'],
			/**
			 * Terms from the software-types vocabulary, not included in the codemeta
			 * context.
			 *
			 * @see https://github.com/codemeta/codemeta/issues/271
			 */
			CommandLineApplication: { '@id': 'stypes:CommandLineApplication' },
			DesktopApplication: { '@id': 'stypes:DesktopApplication' },
			executableName: { '@id': 'stypes:executableName' },
			SoftwareLibrary: { '@id': 'stypes:SoftwareLibrary' },
			stypes: 'https://w3id.org/software-types#',
			WebApplication: { '@id': 'schema:WebApplication' },
		},
	}

	return JSON.stringify(newJson, undefined, 2)
}

const PREFIXES: Record<string, string> = {
	codemeta: 'https://codemeta.github.io/terms/',
	schema: 'http://schema.org/',
}

function resolveToUri(prefix: string): string {
	const uri = PREFIXES[prefix]
	if (uri === undefined || uri === '') {
		throw new Error(`Unknown prefix: ${prefix}`)
	}

	return uri
}

/**
 * Record a single crosswalk mapping for a source key. For codemeta-V1/V2 only
 * actual renames (source key differs from the V3 property name) are recorded,
 * prefixed with the resolved URI to match expanded keys.
 */
function addSourceKeyMapping(
	sourceMap: Record<string, string>,
	source: string,
	sourceKey: string,
	codeMetaPropertyName: string,
	parentType: string,
	fullPropertyKey: string,
): void {
	if (source === 'codemeta-V1' || source === 'codemeta-V2') {
		if (sourceKey === codeMetaPropertyName) {
			return
		}

		const schemaContext = parentType.split(':', 1).at(0)
		if (schemaContext === undefined) {
			throw new Error(`Invalid schema context for parentType: ${parentType}`)
		}

		const uri = resolveToUri(schemaContext)
		sourceMap[`${uri}${sourceKey}`] = `${uri}${codeMetaPropertyName}`
		return
	}

	sourceMap[sourceKey] = fullPropertyKey
}

/**
 * Downloads the crosswalk CSV from GitHub, builds a map of various project
 * metadata formats to CodeMeta source keys, and saves it as a JSON file.
 *
 * @returns File path of the new JSON file
 */
async function updateCrossWalkJson(
	versionTag: string,
	destinationDirectory: string,
): Promise<string> {
	// Download crosswalk CSV from GitHub
	const codemetaCrosswalkUrl = `https://raw.githubusercontent.com/codemeta/codemeta/${versionTag}/crosswalk.csv`
	const crosswalkColumnMap = await getColumnMapFromCsvUrl(codemetaCrosswalkUrl)
	const propertyColumn = crosswalkColumnMap['Property']
	const parentTypeColumn = crosswalkColumnMap['Parent Type']
	const typeColumn = crosswalkColumnMap['Type']
	if (propertyColumn === undefined || parentTypeColumn === undefined || typeColumn === undefined) {
		throw new Error('Crosswalk CSV is missing required columns: Property, Parent Type, Type')
	}

	const crosswalkRecords: {
		maps: Record<string, Record<string, string>>
		types: Record<string, string[]>
	} = {
		maps: {},
		types: {},
	}

	// Source keys we care about for our parsers
	const SOURCES = [
		'codemeta-V1',
		'codemeta-V2',
		'Java (Maven)',
		'NodeJS',
		'publiccode',
		'Python Distutils (PyPI)',
		'Python PKG-INFO',
		'Ruby Gem',
		'Rust Package Manager',
	]
	for (const source of SOURCES) {
		// For each row, get value of column ['property'] and [source]
		for (const [rowIndex, codeMetaPropertyName] of propertyColumn.entries()) {
			const sourceValue = crosswalkColumnMap[source]?.[rowIndex]
			if (is.nonEmptyStringAndNotWhitespace(sourceValue)) {
				const parentType = (parentTypeColumn[rowIndex] ?? '').trim()

				const sourceMap = crosswalkRecords.maps[source] ?? {}
				crosswalkRecords.maps[source] = sourceMap

				// Split on '/' or ',' and add each key to the record
				const fullPropertyKey = `${parentType}/${codeMetaPropertyName}`
				for (const key of sourceValue.split(COMMA_OR_SLASH_REGEX)) {
					addSourceKeyMapping(
						sourceMap,
						source,
						key.trim(),
						codeMetaPropertyName,
						parentType,
						fullPropertyKey,
					)
				}
			}
		}
	}

	// Also create a map of CodeMeta property names to types
	for (const [rowIndex, codeMetaPropertyName] of propertyColumn.entries()) {
		const parentTypeString = parentTypeColumn[rowIndex] ?? ''
		const rawTypeString = typeColumn[rowIndex] ?? ''
		const typeValues = rawTypeString
			.split(' or ')
			.map((t) => t.trim())
			.filter((t) => is.nonEmptyStringAndNotWhitespace(t))

		crosswalkRecords['types'][`${parentTypeString.trim()}/${codeMetaPropertyName.trim()}`] =
			typeValues
	}

	// Manual fixes and augmentation...
	const nodeJsMap = crosswalkRecords.maps['NodeJS']
	const rustMap = crosswalkRecords.maps['Rust Package Manager']
	const pythonDistutilsMap = crosswalkRecords.maps['Python Distutils (PyPI)']
	const pythonPkgInfoMap = crosswalkRecords.maps['Python PKG-INFO']
	if (
		nodeJsMap === undefined ||
		rustMap === undefined ||
		pythonDistutilsMap === undefined ||
		pythonPkgInfoMap === undefined
	) {
		throw new Error('Crosswalk CSV is missing expected source mappings')
	}

	// NodeJS
	// read-pkg normalizes bugs to an object, so access via bugs.url
	delete nodeJsMap['bugs']
	nodeJsMap['bugs.url'] = 'codemeta:SoftwareSourceCode/issueTracker'
	// Whole object flows through addPropertySmart → emitPersonOrOrg, even though
	// normalization ensures author key is never just a bare string
	delete nodeJsMap['author.email']
	delete nodeJsMap['author.name']

	// Rust — fix and augment crosswalk entries
	rustMap['package.description'] = 'schema:Thing/description'
	rustMap['package.name'] = 'schema:Thing/name'
	// CSV has "package.keyword" (singular); Cargo.toml uses "keywords" (plural)
	rustMap['package.keywords'] = 'schema:CreativeWork/keywords'
	rustMap['package.categories'] = 'schema:SoftwareApplication/applicationCategory'
	// CSV maps dev-dependencies to softwareRequirements; should be softwareSuggestions
	rustMap['dev-dependencies'] = 'codemeta:SoftwareSourceCode/softwareSuggestions'
	// CSV maps package.authors to maintainer; Cargo "authors" semantically means author
	rustMap['package.authors'] = 'schema:CreativeWork/author'

	// Python Distutils (PyPI) — setup.py / setup.cfg field aliases
	// Legacy aliases used in setup.cfg [metadata] section
	pythonDistutilsMap['home-page'] = 'schema:Thing/url'
	pythonDistutilsMap['summary'] = 'schema:Thing/description'
	// CSV has "Version" (capital V from PKG-INFO); setup.py/cfg use lowercase
	pythonDistutilsMap['version'] = 'schema:CreativeWork/version'

	// Python PKG-INFO — augment with fields not in the CSV
	pythonPkgInfoMap['Requires-Dist'] = 'schema:SoftwareApplication/softwareRequirements'
	pythonPkgInfoMap['Requires-Python'] = 'schema:SoftwareSourceCode/runtimePlatform'
	pythonPkgInfoMap['Maintainer'] = 'codemeta:SoftwareSourceCode/maintainer'
	pythonPkgInfoMap['Maintainer-email'] = 'codemeta:SoftwareSourceCode/maintainer'

	// Python PEP 621 — modern pyproject.toml [project] table fields (not in CSV)
	crosswalkRecords.maps['Python PEP 621'] = {
		authors: 'schema:CreativeWork/author',
		description: 'schema:Thing/description',
		keywords: 'schema:CreativeWork/keywords',
		license: 'schema:CreativeWork/license',
		'license-expression': 'schema:CreativeWork/license',
		maintainers: 'codemeta:SoftwareSourceCode/maintainer',
		name: 'schema:Thing/name',
		version: 'schema:CreativeWork/version',
	}

	const crosswalkJson = JSON.stringify(crosswalkRecords, undefined, 2)

	await fs.mkdir(destinationDirectory, { recursive: true })
	const destination = path.join(destinationDirectory, `crosswalk.json`)
	await fs.writeFile(destination, crosswalkJson)

	return destination
}

async function downloadData(
	versionTag: string,
	destinationDirectory: string,
	includeSoftwareTypes: boolean,
) {
	/**
	 * Terms from the software-types vocabulary, not included in the codemeta
	 * context.
	 *
	 * @see https://github.com/codemeta/codemeta/issues/271
	 */

	const codemetaJsonldUrl = `https://raw.githubusercontent.com/codemeta/codemeta/${versionTag}/codemeta.jsonld`

	// Strip ld from suffix for easy import as JSON
	const codemetaJsonldFilePath = await downloadUrlToFile(
		codemetaJsonldUrl,
		destinationDirectory,
		'codemeta.json',
	)

	// Duplicate the codemeta.json file and apply mutations to create a framing context version
	const codemetaFramingFilePath = path.join(destinationDirectory, 'codemeta-framing.json')
	await fs.copyFile(codemetaJsonldFilePath, codemetaFramingFilePath)
	await mutateFile(codemetaFramingFilePath, framingContextMutation)

	if (includeSoftwareTypes) {
		// Add software-types terms to the codemeta context
		await mutateFile(codemetaJsonldFilePath, softwareTypesTermsMutation)
		await mutateFile(codemetaFramingFilePath, softwareTypesTermsMutation)
	}

	// Download crosswalk CSV and convert to JSON
	const crosswalkJsonPath = await updateCrossWalkJson(versionTag, destinationDirectory)

	// Update the JSON-LD context cache
	const contextCachePath = await updateContextCache(destinationDirectory, true)

	// Format nicely
	await runPrettierOnFile(codemetaJsonldFilePath)
	await runPrettierOnFile(codemetaFramingFilePath)
	await runPrettierOnFile(crosswalkJsonPath)
	await runPrettierOnFile(contextCachePath)
}

// Change the tag name here to get the latest...
// Note CSV customizations in updateCrossWalkJson() above
// Note software-types context additions in softwareTypesTermsMutation() above
await downloadData('3.1', './scripts/data', true)
