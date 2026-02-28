import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pypiSource } from '../../src/lib/sources/pypi'

const context: SourceContext = {
	codemeta: { name: 'requests' },
	credentials: {},
	path: resolve('.'),
}

describe('pypi source', () => {
	it('should not be available without pyproject.toml', async () => {
		const noTomlContext: SourceContext = {
			codemeta: { name: 'requests' },
			credentials: {},
			path: '/tmp',
		}
		expect(await pypiSource.isAvailable(noTomlContext)).toBe(false)
	})

	it('should extract data for a known package', async () => {
		const result = await pypiSource.extract(context)

		expect(result.versionLatest).toBeDefined()
		expect(typeof result.versionLatest).toBe('string')
		expect(result.releaseCount).toBeGreaterThan(0)
		// Download fields depend on pypistats API which may be rate-limited
		const downloadFields = [
			'downloads180Days',
			'downloadsDaily',
			'downloadsWeekly',
			'downloadsMonthly',
		] as const
		for (const field of downloadFields) {
			expect(result[field] === undefined || typeof result[field] === 'number').toBe(true)
		}

		if (downloadFields.some((field) => result[field] === undefined)) {
			console.warn('Warning: some pypistats download fields are undefined, likely rate-limited')
		}
	})

	it('should return empty object for nonexistent package', async () => {
		const badContext: SourceContext = {
			codemeta: { name: 'this-package-definitely-does-not-exist-on-pypi-12345' },
			credentials: {},
			path: resolve('.'),
		}
		const result = await pypiSource.extract(badContext)
		expect(result).toEqual({})
	})

	it('should return empty object when no codemeta name', async () => {
		const noNameContext: SourceContext = {
			credentials: {},
			path: resolve('.'),
		}
		const result = await pypiSource.extract(noNameContext)
		expect(result).toEqual({})
	})
})
