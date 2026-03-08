import { XcodeProject } from '@bacons/xcode'
import { XMLParser } from 'fast-xml-parser'
import { randomUUID } from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import plist from 'plist'
import { parse as parseToml } from 'smol-toml'
import { parseDocument as parseYaml } from 'yaml'
import { z } from 'zod'
import { execFileAsync } from './utilities'

const gitHubSearchResultSchema = z.object({
	path: z.string(),
	repository: z.object({
		nameWithOwner: z.string(),
	}),
	url: z.string(),
})

type GitHubSearchResult = z.infer<typeof gitHubSearchResultSchema>

async function getFileSearchResults(
	name: string,
	fuzzySearch = false,
): Promise<GitHubSearchResult[]> {
	const { stdout } = await execFileAsync('gh', [
		'search',
		'code',
		'--filename',
		name,
		'--limit',
		'500',
		'--json',
		'url,repository,path',
	])

	let results = z.array(gitHubSearchResultSchema).parse(JSON.parse(stdout))

	if (!fuzzySearch) {
		results = results.filter((result) => path.basename(result.path) === name)
	}

	return results
}

async function saveFileSearchResult(
	result: GitHubSearchResult,
	destinationDirectory: string,
	validate?: (filename: string, content: string) => boolean,
	folderSuffix = '',
): Promise<void> {
	const rawUrl = result.url
		.replace('https://github.com/', 'https://raw.githubusercontent.com/')
		.replace('/blob/', '/')

	const response = await fetch(rawUrl)
	const content = await response.text()

	const basename = path.basename(result.path)

	const isValid = validate === undefined ? true : validate(basename, content)

	if (!isValid) {
		console.log(`Skipping invalid file: ${rawUrl}`)
		return
	}

	const prefix = result.repository.nameWithOwner.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')

	// Create the nested path if a suffix is provided
	const fullDestinationDirectory = folderSuffix
		? path.resolve(destinationDirectory, prefix, `${prefix}${folderSuffix}`)
		: path.resolve(destinationDirectory, prefix)

	await fs.mkdir(fullDestinationDirectory, { recursive: true })

	// Write the file, overwriting if it exists
	await fs.writeFile(path.resolve(fullDestinationDirectory, basename), content, {
		flag: 'w',
	})

	// Check if there are multiple files in the destination directory
	const filesInDirectory = await fs.readdir(fullDestinationDirectory)
	if (filesInDirectory.length > 1) {
		console.warn(
			`[WARNING] Multiple files detected in ${fullDestinationDirectory}:`,
			filesInDirectory,
		)
	}
}

async function saveAllFileSearchResults(
	search: string,
	destination: string,
	fuzzySearch = false,
	validate?: (filename: string, content: string) => boolean,
	folderSuffix = '',
): Promise<void> {
	const results = await getFileSearchResults(search, fuzzySearch)
	const promises = results.map(async (result) =>
		saveFileSearchResult(result, destination, validate, folderSuffix),
	)
	await Promise.all(promises)
}

function isValidJson(_filename: string, content: string): boolean {
	try {
		JSON.parse(content)
		return true
	} catch {
		return false
	}
}

function isValidToml(_filename: string, content: string): boolean {
	try {
		parseToml(content)
		return true
	} catch {
		return false
	}
}

function isValidXml(_filename: string, content: string): boolean {
	try {
		new XMLParser().parse(content)
		return true
	} catch {
		return false
	}
}

function isValidLegacyOpenFrameworksAddonXml(filename: string, content: string): boolean {
	if (!isValidXml(filename, content)) {
		return false
	}

	const lowercaseContent = content.toLowerCase()
	return lowercaseContent.includes('<install>') && lowercaseContent.includes('addons')
}

function isValidYaml(_filename: string, content: string): boolean {
	const yamlDocument = parseYaml(content)
	return yamlDocument.errors.length === 0 && yamlDocument.contents !== null
}

function isValidPlist(_filename: string, content: string): boolean {
	try {
		plist.parse(content)
		return true
	} catch {
		return false
	}
}

function isValidArduinoLibraryProperties(filename: string, content: string): boolean {
	// Quick guard clause if your scanner passes the full filename/path
	if (!filename.endsWith('library.properties')) return false

	// Arduino strictly uses the singular 'author' key
	const hasBaseFields =
		/^name\s*=/im.test(content) && /^version\s*=/im.test(content) && /^author\s*=/im.test(content)

	// Check for keys that only exist in the Arduino ecosystem
	const hasArduinoSpecifics =
		/^architectures\s*=/im.test(content) ||
		/^maintainer\s*=/im.test(content) ||
		/^depends\s*=/im.test(content) ||
		/^dot_a_linkage\s*=/im.test(content)

	// Ensure it doesn't accidentally have Processing-exclusive fields
	const hasProcessingSpecifics =
		/^authors\s*=/im.test(content) ||
		/^prettyversion\s*=/im.test(content) ||
		/^minrevision\s*=/im.test(content)

	return hasBaseFields && (hasArduinoSpecifics || !hasProcessingSpecifics)
}

function isValidProcessingLibraryProperties(filename: string, content: string): boolean {
	if (!filename.endsWith('library.properties')) return false

	const hasBaseFields = /^name\s*=/im.test(content) && /^version\s*=/im.test(content)

	// Processing strictly uses the plural 'authors' (or 'authorList' in very old legacy libs)
	const hasProcessingAuthors = /^authors\s*=/im.test(content) || /^authorlist\s*=/im.test(content)

	// Check for Processing's unique versioning system keys
	const hasProcessingSpecifics =
		/^prettyversion\s*=/im.test(content) ||
		/^minrevision\s*=/im.test(content) ||
		/^dependencies\s*=/im.test(content)

	// Ensure it doesn't accidentally have Arduino-exclusive fields
	const hasArduinoSpecifics =
		/^architectures\s*=/im.test(content) ||
		/^maintainer\s*=/im.test(content) ||
		/^depends\s*=/im.test(content)

	return hasBaseFields && (hasProcessingAuthors || hasProcessingSpecifics) && !hasArduinoSpecifics
}

function isValidPbxproj(_filename: string, content: string): boolean {
	// Write to temp file

	const temporaryProjectPath = path.join(os.tmpdir(), `${randomUUID()}-project.pbxproj`)
	fsSync.writeFileSync(temporaryProjectPath, content, 'utf8')
	let valid = false

	try {
		XcodeProject.open(temporaryProjectPath)
		valid = true
	} catch {
		valid = false
	} finally {
		// Clean up temp file
		fsSync.rmSync(temporaryProjectPath, { force: true })
	}

	return valid
}

function isValidLicenseFile(filename: string, _content: string): boolean {
	const normalized = filename.trim().toLowerCase()
	const base = path.basename(normalized)
	const extension = path.extname(base)

	const exactNames = new Set(['copying', 'licence', 'license', 'unlicense'])

	if (exactNames.has(base)) {
		return true
	}

	if (
		(extension === '.md' || extension === '.txt') &&
		exactNames.has(base.slice(0, -extension.length))
	) {
		return true
	}

	return false
}

async function run() {
	console.log('Proceeding with fetch...')

	await saveAllFileSearchResults('codemeta.json', './test/fixtures/codemeta', false, isValidJson)
	await saveAllFileSearchResults('package.json', './test/fixtures/package', false, isValidJson)
	await saveAllFileSearchResults('pyproject.toml', './test/fixtures/python', false, isValidToml)
	await saveAllFileSearchResults('Cargo.toml', './test/fixtures/cargo', false, isValidToml)
	await saveAllFileSearchResults('pom.xml', './test/fixtures/pom', false, isValidXml)
	await saveAllFileSearchResults('publiccode.yml', './test/fixtures/publiccode', false, isValidXml)
	await saveAllFileSearchResults('publiccode.yml', './test/fixtures/publiccode', false, isValidYaml)
	await saveAllFileSearchResults(
		'publiccode.yaml',
		'./test/fixtures/publiccode',
		false,
		isValidYaml,
	)
	await saveAllFileSearchResults('.gemspec', './test/fixtures/ruby-gemspec', true)
	await saveAllFileSearchResults('PKG-INFO', './test/fixtures/pkg-info', false)
	await saveAllFileSearchResults('setup.cfg', './test/fixtures/setup-cfg', false)
	await saveAllFileSearchResults('setup.py', './test/fixtures/setup-py', false)
	await saveAllFileSearchResults('go.mod', './test/fixtures/go-mod', false)
	await saveAllFileSearchResults(
		'.goreleaser.yaml',
		'./test/fixtures/goreleaser',
		false,
		isValidYaml,
	)
	await saveAllFileSearchResults(
		'.goreleaser.yml',
		'./test/fixtures/goreleaser',
		false,
		isValidYaml,
	)
	await saveAllFileSearchResults('license', './test/fixtures/license', false, isValidLicenseFile)
	await saveAllFileSearchResults('licence', './test/fixtures/licence', false, isValidLicenseFile)
	await saveAllFileSearchResults('copying', './test/fixtures/copying', false, isValidLicenseFile)
	await saveAllFileSearchResults(
		'unlicense',
		'./test/fixtures/unlicense',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults('license.md', './test/fixtures/license', false, isValidLicenseFile)
	await saveAllFileSearchResults('licence.md', './test/fixtures/licence', false, isValidLicenseFile)
	await saveAllFileSearchResults('copying.md', './test/fixtures/copying', false, isValidLicenseFile)
	await saveAllFileSearchResults(
		'unlicense.md',
		'./test/fixtures/unlicense',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults(
		'license.txt',
		'./test/fixtures/license',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults(
		'licence.txt',
		'./test/fixtures/licence',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults(
		'copying.txt',
		'./test/fixtures/copying',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults(
		'unlicense.txt',
		'./test/fixtures/unlicense',
		false,
		isValidLicenseFile,
	)
	await saveAllFileSearchResults('readme.md', './test/fixtures/readme', false)
	await saveAllFileSearchResults(
		'info.plist',
		'./test/fixtures/xcode-info-plist',
		false,
		isValidPlist,
	)
	await saveAllFileSearchResults(
		'Info.plist',
		'./test/fixtures/xcode-info-plist',
		false,
		isValidPlist,
	)

	// This will now properly resolve to:
	// ./test/fixtures/pbxproj/[prefix]/[prefix].xcodeproj/project.pbxproj
	await saveAllFileSearchResults(
		'project.pbxproj',
		'./test/fixtures/pbxproj',
		false,
		isValidPbxproj,
		'.xcodeproj',
	)

	await saveAllFileSearchResults(
		'cinderblock.xml',
		'./test/fixtures/cinderblock',
		false,
		isValidXml,
	)
	await saveAllFileSearchResults('addon_config.mk', './test/fixtures/addon-config', false)
	await saveAllFileSearchResults(
		'install.xml',
		'./test/fixtures/install-xml',
		false,
		isValidLegacyOpenFrameworksAddonXml,
	)
	await saveAllFileSearchResults(
		'library.properties',
		'./test/fixtures/arduino-library-properties',
		false,
		isValidArduinoLibraryProperties,
	)
	await saveAllFileSearchResults(
		'library.properties',
		'./test/fixtures/processing-library-properties',
		false,
		isValidProcessingLibraryProperties,
	)
}

await run()
