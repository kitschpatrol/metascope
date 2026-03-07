import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pbxprojSource } from '../../src/lib/sources/pbxproj'

const fixturesDir = resolve('test/fixtures/pbxproj')

describe('pbxproj source', () => {
	it('should be available in a directory with a .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'c2p-cmd-jokeapi'),
		}
		expect(await pbxprojSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pbxprojSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'c2p-cmd-jokeapi'),
		}
		const result = await pbxprojSource.extract(context)

		expect(result.version).toBe('0.1')
		expect(result.identifier).toBe('com.kidastudios.aioEntertainment')
		expect(result.programmingLanguage).toBe('Swift')
	})
})
