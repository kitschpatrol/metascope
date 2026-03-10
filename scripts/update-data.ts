/* eslint-disable max-depth */
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
		// eslint-disable-next-line ts/no-unsafe-type-assertion
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
	// eslint-disable-next-line ts/no-unsafe-type-assertion, ts/no-explicit-any
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
	// eslint-disable-next-line ts/no-unsafe-type-assertion, ts/no-explicit-any
	const json = JSON.parse(content) as { '@context': Record<string, any> }

	const newJson = {
		...json,
		'@context': {
			...json['@context'],
			/**
			 * Terms from the software-types vocabulary, not included in the codemeta context.
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
	if (!PREFIXES[prefix]) {
		throw new Error(`Unknown prefix: ${prefix}`)
	}

	return PREFIXES[prefix]
}

/**
 * Downloads the crosswalk CSV from GitHub, builds a map of various project
 * metadata formats to CodeMeta source keys, and saves it as a JSON file.
 * @returns File path of the new JSON file
 */
async function updateCrossWalkJson(
	versionTag: string,
	destinationDirectory: string,
): Promise<string> {
	// Download crosswalk CSV from GitHub
	const codemetaCrosswalkUrl = `https://raw.githubusercontent.com/codemeta/codemeta/${versionTag}/crosswalk.csv`
	const crosswalkColumnMap = await getColumnMapFromCsvUrl(codemetaCrosswalkUrl)
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
		for (const [rowIndex, codeMetaPropertyName] of crosswalkColumnMap.Property.entries()) {
			const sourceValue = crosswalkColumnMap[source][rowIndex]
			if (is.nonEmptyStringAndNotWhitespace(sourceValue)) {
				const parentType = crosswalkColumnMap['Parent Type'][rowIndex].trim()

				crosswalkRecords.maps[source] ??= {}

				// Split on '/' or ',' and add each key to the record
				const fullPropertyKey = `${parentType}/${codeMetaPropertyName}`
				for (const key of sourceValue.split(/[,/]/)) {
					const sourceKey = key.trim()

					// Special handling for codemeta-V1 and V2, we only care if the value is an actual rename
					// (i.e. source key name differs from V3 property name)
					if (source === 'codemeta-V1' || source === 'codemeta-V2') {
						if (sourceKey !== codeMetaPropertyName) {
							// Also needs to be prefixed with URI to match expanded keys
							const schemaContext = parentType.split(':').at(0)
							if (schemaContext === undefined) {
								throw new Error(`Invalid schema context for parentType: ${parentType}`)
							}
							const uri = resolveToUri(schemaContext)
							crosswalkRecords.maps[source][`${uri}${sourceKey}`] = `${uri}${codeMetaPropertyName}`
						}
					} else {
						crosswalkRecords.maps[source][sourceKey] = fullPropertyKey
					}
				}
			}
		}
	}

	// Also create a map of CodeMeta property names to types
	for (const [rowIndex, codeMetaPropertyName] of crosswalkColumnMap.Property.entries()) {
		const parentTypeString = crosswalkColumnMap['Parent Type'][rowIndex]
		const rawTypeString = crosswalkColumnMap['Type'][rowIndex]
		const typeValues = rawTypeString
			.split(' or ')
			.map((t) => t.trim())
			.filter((t) => is.nonEmptyStringAndNotWhitespace(t))

		crosswalkRecords['types'][`${parentTypeString.trim()}/${codeMetaPropertyName.trim()}`] =
			typeValues
	}

	// Manual fixes and augmentation...

	// NodeJS
	// read-pkg normalizes bugs to an object, so access via bugs.url
	delete crosswalkRecords.maps['NodeJS']['bugs']
	crosswalkRecords.maps['NodeJS']['bugs.url'] = 'codemeta:SoftwareSourceCode/issueTracker'
	// Whole object flows through addPropertySmart → emitPersonOrOrg, even though
	// normalization ensures author key is never just a bare string
	delete crosswalkRecords.maps['NodeJS']['author.email']
	delete crosswalkRecords.maps['NodeJS']['author.name']

	// Rust — fix and augment crosswalk entries
	crosswalkRecords.maps['Rust Package Manager']['package.description'] = 'schema:Thing/description'
	crosswalkRecords.maps['Rust Package Manager']['package.name'] = 'schema:Thing/name'
	// CSV has "package.keyword" (singular); Cargo.toml uses "keywords" (plural)
	crosswalkRecords.maps['Rust Package Manager']['package.keywords'] = 'schema:CreativeWork/keywords'
	crosswalkRecords.maps['Rust Package Manager']['package.categories'] =
		'schema:SoftwareApplication/applicationCategory'
	// CSV maps dev-dependencies to softwareRequirements; should be softwareSuggestions
	crosswalkRecords.maps['Rust Package Manager']['dev-dependencies'] =
		'codemeta:SoftwareSourceCode/softwareSuggestions'
	// CSV maps package.authors to maintainer; Cargo "authors" semantically means author
	crosswalkRecords.maps['Rust Package Manager']['package.authors'] = 'schema:CreativeWork/author'

	// Python Distutils (PyPI) — setup.py / setup.cfg field aliases
	// Legacy aliases used in setup.cfg [metadata] section
	crosswalkRecords.maps['Python Distutils (PyPI)']['home-page'] = 'schema:Thing/url'
	crosswalkRecords.maps['Python Distutils (PyPI)']['summary'] = 'schema:Thing/description'
	// CSV has "Version" (capital V from PKG-INFO); setup.py/cfg use lowercase
	crosswalkRecords.maps['Python Distutils (PyPI)']['version'] = 'schema:CreativeWork/version'

	// Python PKG-INFO — augment with fields not in the CSV
	crosswalkRecords.maps['Python PKG-INFO']['Requires-Dist'] =
		'schema:SoftwareApplication/softwareRequirements'
	crosswalkRecords.maps['Python PKG-INFO']['Requires-Python'] =
		'schema:SoftwareSourceCode/runtimePlatform'
	crosswalkRecords.maps['Python PKG-INFO']['Maintainer'] = 'codemeta:SoftwareSourceCode/maintainer'
	crosswalkRecords.maps['Python PKG-INFO']['Maintainer-email'] =
		'codemeta:SoftwareSourceCode/maintainer'

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
	 * Terms from the software-types vocabulary, not included in the codemeta context.
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
