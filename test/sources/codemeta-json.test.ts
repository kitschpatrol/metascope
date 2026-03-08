import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { codemetaJsonSource } from '../../src/lib/sources/codemeta-json'

const fixturesDirectory = resolve('test/fixtures/codemeta-json')

describe('codemeta-json source', () => {
	it('should be available in a directory with a codemeta.json file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'caltechlibrary-iga'),
		}
		expect(await codemetaJsonSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without codemeta.json', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await codemetaJsonSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'caltechlibrary-iga'),
		}
		const result = await codemetaJsonSource.extract(context)

		expect(result.name).toBe('InvenioRDM GitHub Archiver (IGA)')
		expect(result.version).toBe('1.3.5')
		expect(result.author).toBeDefined()
		expect(result.author!.length).toBe(2)
	})
})
