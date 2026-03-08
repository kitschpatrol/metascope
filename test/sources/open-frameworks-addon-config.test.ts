import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { openFrameworksAddonConfigSource } from '../../src/lib/sources/open-frameworks-addon-config'

const fixturesDirectory = resolve('test/fixtures/open-frameworks-addon-config')

describe('openFrameworksAddonConfig source', () => {
	it('should be available in a directory with addon_config.mk', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer'),
		}
		expect(await openFrameworksAddonConfigSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without addon_config.mk', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await openFrameworksAddonConfigSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed addon config data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'arturoc-ofxgstreamer'),
		}
		const result = await openFrameworksAddonConfigSource.extract(context)

		expect(result.name).toBe('ofxGStreamer')
		expect(result.author).toBe('Arturo Castro')
		expect(result.tags).toEqual(['GStreamer', 'video', 'audio', 'network'])
		expect(result.platformSections).toContain('osx')
		expect(result.platformSections).toContain('vs')
	})
})
