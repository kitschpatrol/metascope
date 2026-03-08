import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { processingLibraryPropertiesSource } from '../../src/lib/sources/processing-library-properties'

const fixturesDirectory = resolve('test/fixtures/processing-library-properties')

describe('processingLibraryProperties source', () => {
	it('should be available in a directory with Processing library.properties', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'hx2a-camera3d'),
		}
		expect(await processingLibraryPropertiesSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without library.properties', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await processingLibraryPropertiesSource.isAvailable(context)).toBe(false)
	})

	it('should not be available for Arduino library.properties', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve('test/fixtures/arduino-library-properties/0xpit-esparklines'),
		}
		expect(await processingLibraryPropertiesSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed library properties data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'hx2a-camera3d'),
		}
		const result = await processingLibraryPropertiesSource.extract(context)

		expect(result.name).toBe('Camera 3D')
		expect(result.authors).toEqual([{ name: 'Jim Schmitz', url: 'https://ixora.io/' }])
		expect(result.categories).toEqual(['3D'])
		expect(result.version).toBe(8)
		expect(result.minRevision).toBe(233)
	})
})
