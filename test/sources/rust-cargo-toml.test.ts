import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { parse as parseCargoToml, rustCargoTomlSource } from '../../src/lib/sources/rust-cargo-toml'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/rust-cargo-toml')

describe('rustCargoToml source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with Cargo.toml', async () => {
		expect(
			await rustCargoTomlSource.getInputs({ options: { path: resolve(fixturesDirectory, 'aeshirey-emlparser') } }),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without Cargo.toml', async () => {
		expect(
			await rustCargoTomlSource.getInputs({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract parsed Cargo.toml data', async () => {
		const result = await rustCargoTomlSource.parseInput('Cargo.toml', { options: { path: resolve(fixturesDirectory, 'aeshirey-emlparser') } })

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('eml-parser')
		expect(result!.data.version).toBe('0.1.5')
		expect(result!.data.authors).toEqual([{ email: 'adam@shirey.ch', name: 'Adam Shirey' }])
		expect(result!.data.repository).toBe('https://github.com/aeshirey/EmlParser/')
	})
})

describe('parse', () => {
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

	// TODO: Revisit these fixtures — they were known to fail with the old
	// @kitschpatrol/codemeta parser. Our basic parser handles them, but they
	// may expose edge cases in normalization or downstream consumption.
	it('should parse known-failing fixtures without throwing', async () => {
		const failingDirectory = resolve('test/fixtures/rust-cargo-toml-failing')
		const entries = await readdir(failingDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBe(1)

		for (const directory of directories) {
			const content = await readFile(
				resolve(failingDirectory, directory.name, 'Cargo.toml'),
				'utf8',
			)
			expect(
				() => parseCargoToml(content),
				`failing fixture "${directory.name}" should still parse`,
			).not.toThrow()
		}
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
