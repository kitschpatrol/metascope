import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pypiSource } from '../../src/lib/sources/pypi'

const fixturesDirectory = resolve('test/fixtures/pyproject')

describe('pypi source', () => {
	it('should not be available without pyproject.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pypiSource.isAvailable(context)).toBe(false)
	})

	it('should extract data for a known package', async () => {
		// Use a fixture with a pyproject.toml containing a known PyPI package
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
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
		// Create a temp directory with a fake pyproject.toml

		const tempDirectory = mkdtempSync(join('/tmp', 'pypi-test-'))
		writeFileSync(
			join(tempDirectory, 'pyproject.toml'),
			'[project]\nname = "this-package-definitely-does-not-exist-on-pypi-12345"',
		)
		const context: SourceContext = {
			credentials: {},
			path: tempDirectory,
		}
		const result = await pypiSource.extract(context)
		expect(result).toEqual({})
	})

	it('should return empty object when no package name found', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve('.'),
		}
		const result = await pypiSource.extract(context)
		expect(result).toEqual({})
	})
})
