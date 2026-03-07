import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseArduinoLibraryProperties } from '../../src/lib/parsers/arduino-library-properties-parser'

const fixturesDir = resolve('test/fixtures/arduino-library-properties')

describe('parseArduinoLibraryProperties', () => {
	it('should parse a simple library properties file', async () => {
		const content = await readFile(
			resolve(fixturesDir, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parseArduinoLibraryProperties(content)

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
			resolve(fixturesDir, 'abelectronicsuk-abelectronics-arduino-libraries/library.properties'),
			'utf8',
		)
		const result = parseArduinoLibraryProperties(content)

		expect(result.name).toBe('ABElectronics_ADCDifferentialPi')
		expect(result.maintainer).toEqual({
			email: 'sales@abelectronics.co.uk',
			name: 'AB Electronics UK',
		})
		expect(result.category).toBe('Device Control')
	})

	it('should parse dependencies', async () => {
		const content = await readFile(
			resolve(fixturesDir, 'adafruit-adafruit-ccs811/library.properties'),
			'utf8',
		)
		const result = parseArduinoLibraryProperties(content)

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
			resolve(fixturesDir, '0xpit-esparklines/library.properties'),
			'utf8',
		)
		const result = parseArduinoLibraryProperties(content)

		expect(result.raw).toBeDefined()
		expect(result.raw.name).toBe('ESParklines')
		expect(result.raw.version).toBe('0.0.1')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDir, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(dirs.length).toBeGreaterThan(0)

		for (const dir of dirs) {
			const content = await readFile(resolve(fixturesDir, dir, 'library.properties'), 'utf8')
			expect(() => parseArduinoLibraryProperties(content)).not.toThrow()
		}
	})
})
