import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { parse, pythonPyprojectTomlSource } from '../../src/lib/sources/python-pyproject-toml'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/python-pyproject-toml')

describe('pythonPyprojectToml source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a pyproject.toml file', async () => {
		expect(
			await pythonPyprojectTomlSource.getInputs({
				metadata: {},
				options: { path: resolve(fixturesDirectory, 'proycon-codemetapy') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without pyproject.toml', async () => {
		expect(
			await pythonPyprojectTomlSource.getInputs({
				metadata: {},
				options: { path: resolve('test/fixtures/_empty') },
			}),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await pythonPyprojectTomlSource.parseInput('pyproject.toml', {
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'proycon-codemetapy') },
		})

		expect(result).toBeDefined()
		expect(result!.source).toBe('pyproject.toml')
		expect(result!.data.project?.name).toBe('codemetapy')
		expect(result!.data.project?.version).toBe('2.5.3')
		expect(result!.data.project?.dependencies).toContain('rdflib>=6.0.0')
	})
})

describe('parse', () => {
	it('should parse basic project fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.name).toBe('codemetapy')
		expect(result.project?.version).toBe('2.5.3')
		expect(result.project?.description).toBe('Generate and manage CodeMeta software metadata')
	})

	it('should parse license as SPDX string', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.license).toEqual({ spdx: 'GPL-3.0-or-later' })
	})

	it('should parse authors', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.authors).toEqual([
			{ email: 'proycon@anaproy.nl', name: 'Maarten van Gompel' },
		])
	})

	it('should parse keywords', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.keywords).toEqual(['codemeta', 'metadata', 'linked-data'])
	})

	it('should parse dependencies', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.dependencies).toContain('rdflib>=6.0.0')
		expect(result.project?.dependencies).toContain('nameparser')
		expect(result.project?.dependencies).toContain('requests')
	})

	it('should parse project URLs', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.urls?.Homepage).toBe('https://github.com/proycon/codemetapy')
		expect(result.project?.urls?.Repository).toBe('https://github.com/proycon/codemetapy')
	})

	it('should parse classifiers', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'ameli-special-functions/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.project?.classifiers).toContain('Programming Language :: Python :: 3.12')
	})

	it('should parse build-system', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'cloudtools-sha256/pyproject.toml'),
			'utf8',
		)
		const result = parse(content)

		expect(result.buildSystem?.requires).toContain('setuptools')
		expect(result.buildSystem?.requires).toContain('cython')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			if (!files.includes('pyproject.toml')) continue

			const content = readFileSync(resolve(directoryPath, 'pyproject.toml'), 'utf8')
			expect(() => parse(content), `fixture "${directory.name}" should parse`).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(22)
	})
})
