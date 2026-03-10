import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import { codemetaJsonSource, parse as parseCodemetaJson } from '../../src/lib/sources/codemeta-json'

const fixturesDirectory = resolve('test/fixtures/codemeta-json')

describe('codemeta-json source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a codemeta.json file', async () => {
		expect(
			await codemetaJsonSource.getInputs({
				options: { path: resolve(fixturesDirectory, 'caltechlibrary-iga') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without codemeta.json', async () => {
		expect(
			await codemetaJsonSource.getInputs({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await codemetaJsonSource.parseInput('codemeta.json', {
			options: { path: resolve(fixturesDirectory, 'caltechlibrary-iga') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('InvenioRDM GitHub Archiver (IGA)')
		expect(result!.data.version).toBe('1.3.5')
		expect(result!.data.author).toBeDefined()
		expect(result!.data.author).toHaveLength(2)
	})
})

describe('parse', () => {
	it('should parse basic fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('InvenioRDM GitHub Archiver (IGA)')
		expect(result!.version).toBe('1.3.5')
		expect(result!.description).toContain('InvenioRDM GitHub Archiver')
	})

	it('should parse authors with structured fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.author).toBeDefined()
		expect(result!.author!.length).toBe(2)
		expect(result!.author![0].givenName).toBe('Michael')
		expect(result!.author![0].familyName).toBe('Hucka')
		expect(result!.author![0].type).toBe('Person')
		expect(result!.author![0].affiliation).toBe('California Institute of Technology Library')
	})

	it('should parse keywords', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.keywords).toContain('software')
		expect(result!.keywords).toContain('archiving')
	})

	it('should parse URLs', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.codeRepository).toBe('https://github.com/caltechlibrary/iga')
		expect(result!.url).toBe('https://caltechlibrary.github.io/iga')
		expect(result!.issueTracker).toBe('https://github.com/caltechlibrary/iga/issues')
	})

	it('should parse license', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.license).toBe('https://github.com/caltechlibrary/iga/blob/main/LICENSE')
	})

	it('should parse maintainers and copyrightHolder', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'caltechlibrary-iga/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.maintainer).toBeDefined()
		expect(result!.maintainer!.length).toBe(1)
		expect(result!.maintainer![0].familyName).toBe('Morrell')

		expect(result!.copyrightHolder).toBeDefined()
		expect(result!.copyrightHolder!.length).toBe(1)
		expect(result!.copyrightHolder![0].type).toBe('Organization')
	})

	it('should parse programming languages', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'amey-thakur-cloud-services-website/codemeta.json'),
			'utf8',
		)
		const result = parseCodemetaJson(content)

		expect(result!.programmingLanguage).toEqual(['HTML', 'CSS', 'JavaScript'])
	})

	it('should handle v1 property names', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'v1-example/codemeta.json'), 'utf8')
		const result = parseCodemetaJson(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('DeepSeaTreasure')
		// V1 "agents" → "author"
		expect(result!.author).toBeDefined()
		expect(result!.author!.length).toBe(2)
		expect(result!.author![0].name).toBe('Thomas Cassimon')
	})

	it('should handle v1 dependencies', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'v1-all-fields/codemeta.json'), 'utf8')
		const result = parseCodemetaJson(content)

		// V1 "depends" → "softwareRequirements"
		expect(result!.softwareRequirements).toBeDefined()
		expect(result!.softwareRequirements!.length).toBeGreaterThan(0)
		expect(result!.softwareRequirements![0].name).toBe('export_fig')
	})

	it('should strip JSON-LD boilerplate', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'with-id/codemeta.json'), 'utf8')
		const result = parseCodemetaJson(content)

		// @context, @type, @id should not appear as keys
		expect(result).not.toHaveProperty('@context')
		expect(result).not.toHaveProperty('@type')
		expect(result).not.toHaveProperty('@id')
	})

	it('should return undefined for invalid JSON', () => {
		expect(parseCodemetaJson('not json')).toBeUndefined()
	})

	// TODO: Revisit these fixtures — they were known to fail with the old
	// @kitschpatrol/codemeta parser. Our basic parser handles them, but they
	// may expose edge cases in normalization or downstream consumption.
	it('should parse known-failing fixtures without returning undefined', async () => {
		const failingDirectory = resolve('test/fixtures/codemeta-json-failing')
		const entries = await readdir(failingDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBe(51)

		for (const directory of directories) {
			const directoryPath = resolve(failingDirectory, directory.name)
			const content = readFileSync(resolve(directoryPath, 'codemeta.json'), 'utf8')
			const result = parseCodemetaJson(content)
			expect(result, `failing fixture "${directory.name}" should still parse`).toBeDefined()
		}
	})

	it('should parse all fixtures without returning undefined', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			if (!files.includes('codemeta.json')) continue

			const content = readFileSync(resolve(directoryPath, 'codemeta.json'), 'utf8')
			const result = parseCodemetaJson(content)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(41)
	})
})
