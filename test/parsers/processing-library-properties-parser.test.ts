import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseProcessingLibraryProperties } from '../../src/lib/parsers/processing-library-properties-parser'

const fixturesDirectory = resolve('test/fixtures/processing-library-properties')

describe('parseProcessingLibraryProperties', () => {
	it('should parse a library with escaped URLs and revision constraints', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'hx2a-camera3d/library.properties'),
			'utf8',
		)
		const result = parseProcessingLibraryProperties(content)

		expect(result.name).toBe('Camera 3D')
		expect(result.authors).toEqual([{ name: 'Jim Schmitz', url: 'https://ixora.io/' }])
		expect(result.categories).toEqual(['3D'])
		expect(result.url).toBe('https://ixora.io/projects/camera-3D/')
		expect(result.prettyVersion).toBe('1.3.0')
		expect(result.version).toBe(8)
		expect(result.minRevision).toBe(233)
		expect(result.maxRevision).toBe(0)
	})

	it('should parse a library with legacy authorList field', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'artboffin-rocketuc/library.properties'),
			'utf8',
		)
		const result = parseProcessingLibraryProperties(content)

		expect(result.name).toBe('ROCKETuC')
		expect(result.authors).toEqual([{ name: 'Alexander Reben', url: 'http://www.areben.com' }])
		expect(result.categories).toEqual(['I/O'])
		expect(result.version).toBe(1)
		expect(result.prettyVersion).toBe('0.01')
	})

	it('should include raw key-value pairs', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'hx2a-camera3d/library.properties'),
			'utf8',
		)
		const result = parseProcessingLibraryProperties(content)

		expect(result.raw).toBeDefined()
		expect(result.raw.name).toBe('Camera 3D')
		expect(result.raw.version).toBe('8')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(dirs.length).toBeGreaterThan(0)

		for (const dir of dirs) {
			const content = await readFile(resolve(fixturesDirectory, dir, 'library.properties'), 'utf8')
			expect(() => parseProcessingLibraryProperties(content)).not.toThrow()
		}
	})
})
