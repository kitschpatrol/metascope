import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import {
	arduinoLibraryPropertiesSource,
	parse,
} from '../../src/lib/sources/arduino-library-properties'
import { firstOf } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/arduino-library-properties')

describe('arduinoLibraryProperties source', () => {
	it('should be available in a directory with library.properties', async () => {
		const context: SourceContext = {
			context: {},
			credentials: {},
			fileTree: ['library.properties'],
			offline: false,
			path: resolve(fixturesDirectory, '0xpit-esparklines'),
		}
		expect(await arduinoLibraryPropertiesSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without library.properties', async () => {
		const context: SourceContext = {
			context: {},
			credentials: {},
			fileTree: [],
			offline: false,
			path: '/tmp',
		}
		expect(await arduinoLibraryPropertiesSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed library properties data', async () => {
		const context: SourceContext = {
			context: {},
			credentials: {},
			fileTree: ['library.properties'],
			offline: false,
			path: resolve(fixturesDirectory, 'adafruit-adafruit-ccs811'),
		}
		const result = firstOf(await arduinoLibraryPropertiesSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Adafruit CCS811 Library')
		expect(result!.data.version).toBe('1.1.3')
		expect(result!.data.category).toBe('Sensors')
		expect(result!.data.depends).toEqual([
			{ name: 'Adafruit SSD1306', versionConstraint: undefined },
			{ name: 'Adafruit GFX Library', versionConstraint: undefined },
			{ name: 'Adafruit BusIO', versionConstraint: undefined },
		])
		expect(result!.source).toContain('library.properties')
	})
})

describe('parse', () => {
	it('should parse a simple library properties file', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('ESParklines')
		expect(result.version).toBe('0.0.1')
		expect(result.authors).toEqual([{ email: undefined, name: 'Karl Pitrich' }])
		expect(result.maintainer).toEqual({ email: undefined, name: 'Karl Pitrich' })
		expect(result.sentence).toBe('Sparklines for ESP8266/ES32 Arduino')
		expect(result.category).toBe('Data Processing')
		expect(result.url).toBe('https://github.com/0xPIT/ESParklines.git')
		expect(result.architectures).toEqual(['*'])
		expect(result.includes).toEqual(['SparkLine.h'])
		expect(result.depends).toEqual([])
	})

	it('should parse maintainer with email', async () => {
		const content = await readFile(
			resolve(
				fixturesDirectory,
				'abelectronicsuk-abelectronics-arduino-libraries/library.properties',
			),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('ABElectronics_ADCDifferentialPi')
		expect(result.maintainer).toEqual({
			email: 'sales@abelectronics.co.uk',
			name: 'AB Electronics UK',
		})
		expect(result.category).toBe('Device Control')
	})

	it('should parse dependencies', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'adafruit-adafruit-ccs811/library.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('Adafruit CCS811 Library')
		expect(result.depends).toEqual([
			{ name: 'Adafruit SSD1306', versionConstraint: undefined },
			{ name: 'Adafruit GFX Library', versionConstraint: undefined },
			{ name: 'Adafruit BusIO', versionConstraint: undefined },
		])
		expect(result.category).toBe('Sensors')
	})

	it('should include raw key-value pairs', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parse(content)

		expect(result.raw).toBeDefined()
		expect(result.raw.name).toBe('ESParklines')
		expect(result.raw.version).toBe('0.0.1')
	})
})
