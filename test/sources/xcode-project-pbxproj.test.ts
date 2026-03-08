import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { xcodeProjectPbxprojSource } from '../../src/lib/sources/xcode-project-pbxproj'

const fixturesDirectory = resolve('test/fixtures/xcode-project-pbxproj')

describe('xcodeProjectPbxproj source', () => {
	it('should be available in a directory with a .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'c2p-cmd-jokeapi'),
		}
		expect(await xcodeProjectPbxprojSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await xcodeProjectPbxprojSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'c2p-cmd-jokeapi'),
		}
		const result = await xcodeProjectPbxprojSource.extract(context)

		expect(result.version).toBe('0.1')
		expect(result.identifier).toBe('com.kidastudios.aioEntertainment')
		expect(result.programmingLanguage).toBe('Swift')
	})
})
