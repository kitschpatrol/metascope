import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { pythonPypiRegistrySource } from '../../src/lib/sources/python-pypi-registry'

const fixturesDirectory = resolve('test/fixtures/pyproject')

describe('pythonPypiRegistry source', () => {
	it('should not be available without pyproject.toml', async () => {
		const temporaryDirectory = mkdtempSync(join(tmpdir(), 'pypi-test-'))
		const context = { options: { path: temporaryDirectory } }
		expect(await pythonPypiRegistrySource.extract(context)).toBeUndefined()
	})

	it('should extract data for a known package', async () => {
		// Use a fixture with a pyproject.toml containing a known PyPI package
		const context = { options: { path: resolve(fixturesDirectory, 'proycon-codemetapy') } }
		let result: Awaited<ReturnType<typeof pythonPypiRegistrySource.extract>>
		try {
			result = await pythonPypiRegistrySource.extract(context)
		} catch {
			// Network failures should not fail the test
			console.warn('Warning: PyPI API request failed, skipping test')
			return
		}

		if (result === undefined) {
			// PyPI API may be unavailable or rate-limited
			console.warn('Warning: PyPI API returned no data, skipping assertions')
			return
		}

		expect(result.data.versionLatest).toBeDefined()
		expect(typeof result.data.versionLatest).toBe('string')
		expect(result.data.releaseCount).toBeGreaterThan(0)
		// Download fields depend on pypistats API which may be rate-limited
		const downloadFields = [
			'downloads180Days',
			'downloadsDaily',
			'downloadsWeekly',
			'downloadsMonthly',
		] as const
		for (const field of downloadFields) {
			expect(result.data[field] === undefined || typeof result.data[field] === 'number').toBe(
				true,
			)
		}

		if (downloadFields.some((field) => result!.data[field] === undefined)) {
			console.warn('Warning: some pypistats download fields are undefined, likely rate-limited')
		}
	})

	it('should return undefined for nonexistent package', async () => {
		// Create a temp directory with a fake pyproject.toml

		const temporaryDirectory = mkdtempSync(join('/tmp', 'pypi-test-'))
		writeFileSync(
			join(temporaryDirectory, 'pyproject.toml'),
			'[project]\nname = "this-package-definitely-does-not-exist-on-pypi-12345"',
		)
		const context = { options: { path: temporaryDirectory } }
		const result = await pythonPypiRegistrySource.extract(context)
		expect(result).toBeUndefined()
	})

	it('should return undefined when no package name found', async () => {
		const context = { options: { path: resolve('.') } }
		const result = await pythonPypiRegistrySource.extract(context)
		expect(result).toBeUndefined()
	})
})
