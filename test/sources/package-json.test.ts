import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { packageSource } from '../../src/lib/sources/package-json'

const fixturesDirectory = resolve('test/fixtures/package-json')

describe('package-json source', () => {
	it('should be available in a directory with a package.json file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'bschlenk-node-roku-client'),
		}
		expect(await packageSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without package.json', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await packageSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'bschlenk-node-roku-client'),
		}
		const result = await packageSource.extract(context)

		expect(result.name).toBe('roku-client')
		expect(result.version).toBe('5.2.0')
		expect(result.dependencies).toHaveProperty('xml2js')
	})
})
