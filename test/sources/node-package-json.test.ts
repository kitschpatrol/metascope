import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import { nodePackageJsonSource, parse } from '../../src/lib/sources/node-package-json'

const fixturesDirectory = resolve('test/fixtures/node-package-json')

describe('nodePackageJson source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a package.json file', async () => {
		expect(
			await nodePackageJsonSource.getInputs({
				options: { path: resolve(fixturesDirectory, 'bschlenk-node-roku-client') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without package.json', async () => {
		expect(
			await nodePackageJsonSource.getInputs({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await nodePackageJsonSource.parseInput('package.json', {
			options: { path: resolve(fixturesDirectory, 'bschlenk-node-roku-client') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('roku-client')
		expect(result!.data.version).toBe('5.2.0')
		expect(result!.data.dependencies).toHaveProperty('xml2js')
	})
})

describe('parse', () => {
	it('should parse basic project fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('roku-client')
		expect(result.version).toBe('5.2.0')
		expect(result.description).toBe('Send commands to your Roku devices')
	})

	it('should parse license', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.license).toBe('Apache-2.0')
	})

	it('should parse author', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.author).toEqual({
			email: 'bschlenk@umich.edu',
			name: 'Brian Schlenker',
			url: 'http://github.com/bschlenk',
		})
	})

	it('should parse keywords', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.keywords).toEqual(['roku', 'ssdp'])
	})

	it('should parse dependencies', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.dependencies).toHaveProperty('xml2js')
		expect(result.devDependencies).toHaveProperty('typescript')
	})

	it('should parse homepage and repository', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bschlenk-node-roku-client/package.json'),
			'utf8',
		)
		const result = parse(content)

		expect(result.homepage).toBe('https://github.com/bschlenk/node-roku-client')
		expect(result.repository).toEqual({
			type: 'git',
			url: 'git+https://github.com/bschlenk/node-roku-client.git',
		})
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		// Some fixtures have invalid versions that fail normalization
		const expectedFailures = new Set(['nxpublic-outcast'])

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			if (!files.includes('package.json')) continue

			const content = readFileSync(resolve(directoryPath, 'package.json'), 'utf8')

			if (expectedFailures.has(directory.name)) {
				parsedCount++
				continue
			}

			expect(() => parse(content), `fixture "${directory.name}" should parse`).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(70)
	})
})
