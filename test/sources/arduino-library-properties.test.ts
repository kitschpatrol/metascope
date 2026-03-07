import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { arduinoLibraryPropertiesSource } from '../../src/lib/sources/arduino-library-properties'

const fixturesDir = resolve('test/fixtures/arduino-library-properties')

describe('arduinoLibraryProperties source', () => {
	it('should be available in a directory with library.properties', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, '0xpit-esparklines'),
		}
		expect(await arduinoLibraryPropertiesSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without library.properties', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await arduinoLibraryPropertiesSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed library properties data', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'adafruit-adafruit-ccs811'),
		}
		const result = await arduinoLibraryPropertiesSource.extract(context)

		expect(result.name).toBe('Adafruit CCS811 Library')
		expect(result.version).toBe('1.1.3')
		expect(result.category).toBe('Sensors')
		expect(result.depends).toEqual([
			{ name: 'Adafruit SSD1306', versionConstraint: undefined },
			{ name: 'Adafruit GFX Library', versionConstraint: undefined },
			{ name: 'Adafruit BusIO', versionConstraint: undefined },
		])
	})
})
