import { describe, expect, it } from 'vitest'
import { parseAgeToYears } from '../../src/lib/sources/dependency-updates'

const YEAR_DAYS = 365.25

describe('dependencyUpdates age parsing', () => {
	it('should treat "now" as zero', () => {
		expect(parseAgeToYears('now')).toBe(0)
	})

	// Short units, as emitted by updates v18 and later
	it('should parse sub-day units', () => {
		expect(parseAgeToYears('30s')).toBeCloseTo(30 / (YEAR_DAYS * 24 * 60 * 60), 10)
		expect(parseAgeToYears('45m')).toBeCloseTo(45 / (YEAR_DAYS * 24 * 60), 10)
		expect(parseAgeToYears('12h')).toBeCloseTo(12 / (YEAR_DAYS * 24), 10)
	})

	it('should parse day and week units', () => {
		expect(parseAgeToYears('1d')).toBeCloseTo(1 / YEAR_DAYS, 10)
		expect(parseAgeToYears('2w')).toBeCloseTo(14 / YEAR_DAYS, 10)
	})

	it('should distinguish minutes from months', () => {
		expect(parseAgeToYears('3mo')).toBeCloseTo(0.25, 10)
		expect(parseAgeToYears('3m')).toBeLessThan(parseAgeToYears('3mo'))
	})

	it('should parse years', () => {
		expect(parseAgeToYears('2y')).toBe(2)
	})

	it('should ignore unparsable ages', () => {
		expect(parseAgeToYears('')).toBe(0)
		expect(parseAgeToYears('soon')).toBe(0)
		expect(parseAgeToYears('12')).toBe(0)
		expect(parseAgeToYears('12q')).toBe(0)
		// The long-unit format used by updates v17 and earlier
		expect(parseAgeToYears('2 weeks')).toBe(0)
	})
})
