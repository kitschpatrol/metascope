import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMakefileConfig } from '../../src/lib/parsers/makefile-config-parser'

const fixturesDirectory = resolve('test/fixtures/openframeworks-addon-config-mk')

describe('parseMakefileConfig', () => {
	it('should return an object with name, description, author fields', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer/addon_config.mk'),
			'utf8',
		)
		const result = parseMakefileConfig(content) as any

		expect(result.name).toBe('ofxSpeechSynthesizer')
		expect(result.description).toBeDefined()
		expect(result.author).toBeDefined()
	})

	it('should return an object with tags array and dependencies array', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '2bbb-ofxspeechsynthesizer/addon_config.mk'),
			'utf8',
		)
		const result = parseMakefileConfig(content) as any

		expect(Array.isArray(result.tags)).toBe(true)
		expect(Array.isArray(result.dependencies)).toBe(true)
	})

	it('should return an object with platformSections array', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'arturoc-ofxgstreamer/addon_config.mk'),
			'utf8',
		)
		const result = parseMakefileConfig(content) as any

		expect(Array.isArray(result.platformSections)).toBe(true)
		expect(result.platformSections.length).toBeGreaterThan(0)
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
			expect(() => parseMakefileConfig(content)).not.toThrow()
		}
	})
})
