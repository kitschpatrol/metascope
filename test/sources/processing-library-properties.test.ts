import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	parse,
	processingLibraryPropertiesSource,
} from '../../src/lib/sources/processing-library-properties'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/processing-library-properties')

describe('processingLibraryProperties source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with Processing library.properties', async () => {
		expect(
			await processingLibraryPropertiesSource.getInputs({
				metadata: {},
				options: { path: resolve(fixturesDirectory, 'hx2a-camera3d') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without library.properties', async () => {
		expect(
			await processingLibraryPropertiesSource.getInputs({
				metadata: {},
				options: { path: resolve('test/fixtures/_empty') },
			}),
		).toHaveLength(0)
	})

	it('should not be available for Arduino library.properties', async () => {
		const result = await processingLibraryPropertiesSource.parseInput('library.properties', {
			metadata: {},
			options: { path: resolve('test/fixtures/arduino-library-properties/0xpit-esparklines') },
		})
		expect(result).toBeUndefined()
	})

	it('should extract parsed library properties data', async () => {
		const result = await processingLibraryPropertiesSource.parseInput('library.properties', {
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'hx2a-camera3d') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Camera 3D')
		expect(result!.data.authors).toEqual([{ name: 'Jim Schmitz', url: 'https://ixora.io/' }])
		expect(result!.data.categories).toEqual(['3D'])
		expect(result!.data.version).toBe(8)
		expect(result!.data.minRevision).toBe(233)
		expect(result!.source).toContain('library.properties')
	})
})

describe('parse', () => {
	it('should parse a library with escaped URLs and revision constraints', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'hx2a-camera3d/library.properties'),
			'utf8',
		)
		const result = parse(content)

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
		const result = parse(content)

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
		const result = parse(content)

		expect(result.raw).toBeDefined()
		expect(result.raw.name).toBe('Camera 3D')
		expect(result.raw.version).toBe('8')
	})
})
