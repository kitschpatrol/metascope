import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pythonPypiRegistrySource } from '../../src/lib/sources/python-pypi-registry'
import { firstOf } from '../../src/lib/utilities/template-helpers'

const fixturesDirectory = resolve('test/fixtures/python-pyproject-toml')
const pyprojectTomlFixturesDirectory = resolve('test/fixtures/python-pyproject-toml')

describe('pythonPypiRegistry source', () => {
	it('should not be available without pyproject.toml', async () => {
		const temporaryDirectory = mkdtempSync(join(tmpdir(), 'pypi-test-'))
		const context = { options: { path: temporaryDirectory } }
		expect(await pythonPypiRegistrySource.extract(context)).toBeUndefined()
	})

	it('should extract data for a known package', async () => {
		// Use a fixture with a pyproject.toml containing a known PyPI package
		const context = { options: { path: resolve(fixturesDirectory, 'proycon-codemetapy') } }
		const result = await pythonPypiRegistrySource.extract(context)

		expect(result).toBeDefined()
		const record = firstOf(result)!
		expect(record.data.versionLatest).toBeDefined()
		expect(typeof record.data.versionLatest).toBe('string')
		expect(record.data.releaseCount).toBeGreaterThan(0)
		expect(typeof record.data.downloadsDaily).toBe('number')
		expect(typeof record.data.downloadsWeekly).toBe('number')
		expect(typeof record.data.downloadsMonthly).toBe('number')
		expect(typeof record.data.downloads180Days).toBe('number')
	})

	it('should return undefined for nonexistent package', async () => {
		// Create a temp directory with a fake pyproject.toml

		const temporaryDirectory = mkdtempSync(join(tmpdir(), 'pypi-test-'))
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

	it('should skip registry lookup for packages with a "Private ::" classifier', async () => {
		const context = {
			options: { path: resolve(pyprojectTomlFixturesDirectory, 'private-package') },
		}
		const result = await pythonPypiRegistrySource.extract(context)
		expect(result).toBeUndefined()
	})
})
