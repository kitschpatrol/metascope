import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { cargoTomlSource } from '../../src/lib/sources/cargo-toml'

const fixturesDirectory = resolve('test/fixtures/cargo-toml')

describe('cargoToml source', () => {
	it('should be available in a directory with Cargo.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aeshirey-emlparser'),
		}
		expect(await cargoTomlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without Cargo.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await cargoTomlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed Cargo.toml data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aeshirey-emlparser'),
		}
		const result = await cargoTomlSource.extract(context)

		expect(result.name).toBe('eml-parser')
		expect(result.version).toBe('0.1.5')
		expect(result.authors).toEqual([{ email: 'adam@shirey.ch', name: 'Adam Shirey' }])
		expect(result.repository).toBe('https://github.com/aeshirey/EmlParser/')
	})
})
