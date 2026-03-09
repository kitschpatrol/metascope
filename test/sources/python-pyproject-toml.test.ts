import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { parse, pythonPyprojectTomlSource } from '../../src/lib/sources/python-pyproject-toml'

const fixturesDirectory = resolve('test/fixtures/python-pyproject-toml')

describe('pythonPyprojectToml source', () => {
	it('should be available in a directory with a pyproject.toml file', async () => {
		const context: SourceContext = {
			context: {}, credentials: {}, offline: false,
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		expect(await pythonPyprojectTomlSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without pyproject.toml', async () => {
		const context: SourceContext = {
			context: {}, credentials: {}, offline: false,
			path: '/tmp',
		}
		expect(await pythonPyprojectTomlSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			context: {}, credentials: {}, offline: false,
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		const result = await pythonPyprojectTomlSource.extract(context)

		expect(result).toBeDefined()
		expect(result!.source).toBe(resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'))
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
