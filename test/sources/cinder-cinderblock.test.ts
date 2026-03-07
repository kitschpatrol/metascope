import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { cinderCinderblockSource } from '../../src/lib/sources/cinder-cinderblock'

const fixturesDir = resolve('test/fixtures/cinder-cinderblock')

describe('cinderCinderblock source', () => {
	it('should be available in a directory with cinderblock.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'astellato-cinder-syphon'),
		}
		expect(await cinderCinderblockSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without cinderblock.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await cinderCinderblockSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed cinderblock data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'astellato-cinder-syphon'),
		}
		const result = await cinderCinderblockSource.extract(context)

		expect(result.name).toBe('Syphon')
		expect(result.author).toBe('Anthony Stellato')
		expect(result.supports).toEqual(['macOS'])
		expect(result.git).toBe('https://github.com/astellato/Cinder-Syphon.git')
	})
})
