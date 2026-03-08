import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCargoToml } from '../../src/lib/parsers/cargo-toml-parser'

const fixturesDirectory = resolve('test/fixtures/cargo-toml')

describe('parseCargoToml', () => {
	it('should parse a simple Cargo.toml with package metadata', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'aeshirey-emlparser/Cargo.toml'),
			'utf8',
		)
		const result = parseCargoToml(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('eml-parser')
		expect(result!.version).toBe('0.1.5')
		expect(result!.description).toBe('A library for parsing .eml files.')
		expect(result!.homepage).toBe('https://github.com/aeshirey/EmlParser/')
		expect(result!.repository).toBe('https://github.com/aeshirey/EmlParser/')
		expect(result!.keywords).toEqual(['eml', 'parse', 'email-parsing', 'email'])
		expect(result!.authors).toEqual([{ email: 'adam@shirey.ch', name: 'Adam Shirey' }])
		expect(result!.dependencies).toEqual([
			{ name: 'regex', version: '1' },
			{ name: 'rfc2047-decoder', version: '1.0' },
		])
	})

	it('should parse a complex Cargo.toml with features and multiple dep types', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0x676e67-wreq-util/Cargo.toml'),
			'utf8',
		)
		const result = parseCargoToml(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('wreq-util')
		expect(result!.license).toBe('LGPL-3.0')
		expect(result!.edition).toBe('2024')
		expect(result!.rustVersion).toBe('1.85')
		expect(result!.documentation).toBe('https://docs.rs/wreq-util')
		expect(result!.dependencies.length).toBeGreaterThan(0)
		expect(result!.devDependencies.length).toBeGreaterThan(0)
	})

	it('should parse a workspace Cargo.toml', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'apache-dubbo-rust/Cargo.toml'),
			'utf8',
		)
		const result = parseCargoToml(content)

		expect(result).toBeDefined()
		expect(result!.name).toBeUndefined()
		expect(result!.workspaceMembers).toContain('dubbo')
		expect(result!.workspaceMembers.length).toBeGreaterThan(0)
	})

	it('should return undefined for invalid TOML', () => {
		expect(parseCargoToml('not valid toml {')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(resolve(fixturesDirectory, directory, 'Cargo.toml'), 'utf8')
			expect(() => parseCargoToml(content)).not.toThrow()
		}
	})
})
