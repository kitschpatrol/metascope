import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseProperties } from '../../src/lib/parsers/properties-parser'

const fixturesDirectory = resolve('test/fixtures/arduino-library-properties')

describe('parseProperties (Arduino)', () => {
	it('should return a Record<string, string> with key-value pairs', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parseProperties(content)

		expect(typeof result).toBe('object')
		expect(result.name).toBe('ESParklines')
		expect(result.version).toBe('0.0.1')
		expect(result.author).toBe('Karl Pitrich')
		expect(result.category).toBe('Data Processing')
	})

	it('should correctly split on the first = only', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parseProperties(content)

		expect(result.url).toBe('https://github.com/0xPIT/ESParklines.git')
	})

	it('should return all values as strings', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parseProperties(content)

		for (const value of Object.values(result)) {
			expect(typeof value).toBe('string')
		}
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory, 'library.properties'),
				'utf8',
			)
			expect(() => parseProperties(content)).not.toThrow()
		}
	})
})
