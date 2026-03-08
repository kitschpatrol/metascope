import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { openframeworksAddonConfigMkSource } from '../../src/lib/sources/openframeworks-addon-config-mk'

const fixturesDirectory = resolve('test/fixtures/openframeworks-addon-config-mk')

describe('openframeworksAddonConfigMk source', () => {
	it('should be available in a directory with addon_config.mk', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer'),
		}
		expect(await openframeworksAddonConfigMkSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without addon_config.mk', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await openframeworksAddonConfigMkSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed addon config data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'arturoc-ofxgstreamer'),
		}
		const result = await openframeworksAddonConfigMkSource.extract(context)

		expect(result.name).toBe('ofxGStreamer')
		expect(result.author).toBe('Arturo Castro')
		expect(result.tags).toEqual(['GStreamer', 'video', 'audio', 'network'])
		expect(result.platformSections).toContain('osx')
		expect(result.platformSections).toContain('vs')
	})
})
