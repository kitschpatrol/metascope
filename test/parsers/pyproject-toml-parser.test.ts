import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePyprojectToml } from '../../src/lib/parsers/pyproject-toml-parser'

const fixturesDirectory = resolve('test/fixtures/pyproject')

describe('parsePyprojectToml', () => {
	it('should parse basic project fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.name).toBe('codemetapy')
		expect(result.project?.version).toBe('2.5.3')
		expect(result.project?.description).toBe('Generate and manage CodeMeta software metadata')
	})

	it('should parse license as SPDX string', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.license).toEqual({ spdx: 'GPL-3.0-or-later' })
	})

	it('should parse authors', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.authors).toEqual([
			{ email: 'proycon@anaproy.nl', name: 'Maarten van Gompel' },
		])
	})

	it('should parse keywords', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.keywords).toEqual(['codemeta', 'metadata', 'linked-data'])
	})

	it('should parse dependencies', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.dependencies).toContain('rdflib>=6.0.0')
		expect(result.project?.dependencies).toContain('nameparser')
		expect(result.project?.dependencies).toContain('requests')
	})

	it('should parse project URLs', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'proycon-codemetapy/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.urls?.Homepage).toBe('https://github.com/proycon/codemetapy')
		expect(result.project?.urls?.Repository).toBe('https://github.com/proycon/codemetapy')
	})

	it('should parse classifiers', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'ameli-special-functions/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

		expect(result.project?.classifiers).toContain('Programming Language :: Python :: 3.12')
	})

	it('should parse build-system', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'cloudtools-sha256/pyproject.toml'),
			'utf8',
		)
		const result = parsePyprojectToml(content)

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
			expect(
				() => parsePyprojectToml(content),
				`fixture "${directory.name}" should parse`,
			).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(22)
	})
})
