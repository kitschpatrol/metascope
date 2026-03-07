import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { infoPlistSource } from '../../src/lib/sources/info-plist'

const fixturesDir = resolve('test/fixtures/info-plist')

describe('infoPlist source', () => {
	it('should be available in a directory with Info.plist', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'alexchantastic-alfred-lipsum-workflow'),
		}
		expect(await infoPlistSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without Info.plist', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await infoPlistSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'alexchantastic-alfred-lipsum-workflow'),
		}
		const result = await infoPlistSource.extract(context)

		expect(result.name).toBe('Lorem Ipsum')
		expect(result.author).toBe('Alex Chan')
		expect(result.version).toBe('4.0.3')
		expect(result.identifier).toBe('com.alexchantastic.loremipsum')
	})
})
