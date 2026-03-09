import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	openframeworksAddonConfigMkSource,
	parse,
} from '../../src/lib/sources/openframeworks-addon-config-mk'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/openframeworks-addon-config-mk')

describe('openframeworksAddonConfigMk source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with addon_config.mk', async () => {
		expect(
			await openframeworksAddonConfigMkSource.getInputs({
				metadata: {},
				options: { path: resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without addon_config.mk', async () => {
		expect(
			await openframeworksAddonConfigMkSource.getInputs({
				metadata: {},
				options: { path: resolve('test/fixtures/_empty') },
			}),
		).toHaveLength(0)
	})

	it('should extract parsed addon config data', async () => {
		const result = await openframeworksAddonConfigMkSource.parseInput('addon_config.mk', {
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'arturoc-ofxgstreamer') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('ofxGStreamer')
		expect(result!.data.author).toBe('Arturo Castro')
		expect(result!.data.tags).toEqual(['GStreamer', 'video', 'audio', 'network'])
		expect(result!.data.platformSections).toContain('osx')
		expect(result!.data.platformSections).toContain('vs')
		expect(result!.source).toContain('addon_config.mk')
	})
})

describe('parse', () => {
	it('should parse a simple addon config', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer/addon_config.mk'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('ofxSpeechSynthesizer')
		expect(result.description).toBe('wrapper of AVSpeechSynthesizer')
		expect(result.author).toBe('ISHII 2bit')
		expect(result.tags).toEqual(['sound'])
		expect(result.url).toBe('https://github.com/2bbb/ofxSpeechSynthesizer')
		expect(result.dependencies).toEqual([])
		expect(result.platformSections).toEqual([])
	})

	it('should parse dependencies from common section', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'armadillu-ofxremoteui/addon_config.mk'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('ofxRemoteUI')
		expect(result.dependencies).toEqual(['ofxXmlSettings', 'ofxOsc', 'ofxPoco'])
	})

	it('should parse multiple tags and platform sections', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'arturoc-ofxgstreamer/addon_config.mk'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('ofxGStreamer')
		expect(result.author).toBe('Arturo Castro')
		expect(result.tags).toEqual(['GStreamer', 'video', 'audio', 'network'])
		expect(result.url).toBe('http://github.com/arturoc/ofxGStreamer')
		expect(result.platformSections).toContain('msys2')
		expect(result.platformSections).toContain('vs')
		expect(result.platformSections).toContain('osx')
		expect(result.platformSections).toContain('ios')
	})
})
