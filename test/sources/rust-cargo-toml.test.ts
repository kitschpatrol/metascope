import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { rustCargoTomlSource } from '../../src/lib/sources/rust-cargo-toml'

const fixturesDirectory = resolve('test/fixtures/rust-cargo-toml')

describe('rustCargoToml source', () => {
	it('should be available in a directory with Cargo.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aeshirey-emlparser'),
		}
		expect(await rustCargoTomlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without Cargo.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await rustCargoTomlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed Cargo.toml data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aeshirey-emlparser'),
		}
		const result = await rustCargoTomlSource.extract(context)

		expect(result.name).toBe('eml-parser')
		expect(result.version).toBe('0.1.5')
		expect(result.authors).toEqual([{ email: 'adam@shirey.ch', name: 'Adam Shirey' }])
		expect(result.repository).toBe('https://github.com/aeshirey/EmlParser/')
	})
})
