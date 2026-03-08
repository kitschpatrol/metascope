import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLibraryProperties } from '../../src/lib/parsers/library-properties-parser'

const fixturesDirectory = resolve('test/fixtures/processing-library-properties')

describe('parseLibraryProperties (Processing)', () => {
	it('should return a Record<string, string> with key-value pairs', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'hx2a-camera3d/library.properties'),
			'utf8',
		)
		const result = parseLibraryProperties(content)

		expect(typeof result).toBe('object')
		expect(result.name).toBe('Camera 3D')
		expect(result.version).toBe('8')
		expect(result.prettyVersion).toBe('1.3.0')
	})

	it('should return all values as strings', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'hx2a-camera3d/library.properties'),
			'utf8',
		)
		const result = parseLibraryProperties(content)

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
			expect(() => parseLibraryProperties(content)).not.toThrow()
		}
	})
})
