import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from '../../src/lib/sources/processing-sketch-properties'

const fixturesDirectory = resolve('test/fixtures/processing-sketch-properties')

describe('parse (Processing sketch.properties)', () => {
	it('should parse a Java mode sketch', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'liltove-dancecraft/sketch.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(result.mode).toBe('Java')
		expect(result.modeId).toBe('processing.mode.java.JavaMode')
		expect(result.raw.mode).toBe('Java')
	})

	it('should parse an Android sketch with manifest fields', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'phy6geniuxgh-creative-stack/sketch.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(result.manifestSdkTarget).toBe(26)
		expect(result.manifestSdkMin).toBe(17)
		expect(result.manifestVersionName).toBe('1.0')
		expect(result.manifestVersionCode).toBe(1)
		expect(result.manifestOrientation).toBe('unspecified')
		expect(Array.isArray(result.manifestPermissions)).toBe(true)
	})

	it('should always include raw key-value pairs', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'liltove-dancecraft/sketch.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(typeof result.raw).toBe('object')
		for (const value of Object.values(result.raw)) {
			expect(typeof value).toBe('string')
		}
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory, 'sketch.properties'),
				'utf8',
			)
			expect(() => parse(content)).not.toThrow()
		}
	})
})
