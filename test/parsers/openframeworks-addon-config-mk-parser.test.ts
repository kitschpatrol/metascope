import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseOpenframeworksAddonConfig } from '../../src/lib/parsers/openframeworks-addon-config-mk-parser'

const fixturesDirectory = resolve('test/fixtures/openframeworks-addon-config-mk')

describe('parseOpenframeworksAddonConfig', () => {
	it('should parse a simple addon config', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer/addon_config.mk'),
			'utf8',
		)
		const result = parseOpenframeworksAddonConfig(content)

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
		const result = parseOpenframeworksAddonConfig(content)

		expect(result.name).toBe('ofxRemoteUI')
		expect(result.dependencies).toEqual(['ofxXmlSettings', 'ofxOsc', 'ofxPoco'])
	})

	it('should parse multiple tags and platform sections', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'arturoc-ofxgstreamer/addon_config.mk'),
			'utf8',
		)
		const result = parseOpenframeworksAddonConfig(content)

		expect(result.name).toBe('ofxGStreamer')
		expect(result.author).toBe('Arturo Castro')
		expect(result.tags).toEqual(['GStreamer', 'video', 'audio', 'network'])
		expect(result.url).toBe('http://github.com/arturoc/ofxGStreamer')
		expect(result.platformSections).toContain('msys2')
		expect(result.platformSections).toContain('vs')
		expect(result.platformSections).toContain('osx')
		expect(result.platformSections).toContain('ios')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory, 'addon_config.mk'),
				'utf8',
			)
			expect(() => parseOpenframeworksAddonConfig(content)).not.toThrow()
		}
	})
})
