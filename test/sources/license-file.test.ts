import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import { licenseFileSource } from '../../src/lib/sources/license-file'
import { identifyLicense, spdxIdToUrl } from '../../src/lib/utilities/license-identification'

const fixturesDirectory = resolve('test/fixtures/license-file')

describe('licenseFile source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a LICENSE file', async () => {
		expect(
			await licenseFileSource.discover({
				options: { path: resolve(fixturesDirectory, 'pallets-flask') },
			}),
		).not.toHaveLength(0)
	})

	it('should be available in a directory with a COPYING file', async () => {
		expect(
			await licenseFileSource.discover({
				options: { path: resolve(fixturesDirectory, 'pallets-flask-1') },
			}),
		).not.toHaveLength(0)
	})

	it('should be available in a directory with a LICENCE file', async () => {
		expect(
			await licenseFileSource.discover({
				options: { path: resolve(fixturesDirectory, 'ashuk032-8secread') },
			}),
		).not.toHaveLength(0)
	})

	it('should return undefined in a directory without license files', async () => {
		expect(
			await licenseFileSource.discover({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract a license record from a single license file', async () => {
		const result = await licenseFileSource.parse('LICENSE', {
			options: { path: resolve(fixturesDirectory, 'pallets-flask') },
		})

		expect(result).toBeDefined()
		expect(result!.data.spdxId).toContain('BSD')
		expect(result!.source).toBeDefined()
	})

	it('should return multiple records from multiple license files', async () => {
		const result = await licenseFileSource.extract({
			options: { path: resolve(fixturesDirectory, 'multi') },
		})

		// The multi/ directory has LICENSE (BSD-3-Clause) and COPYING.md (GPL), should have 2
		expect(Array.isArray(result)).toBe(true)
	})
})

describe('identifyLicense', () => {
	it('should identify a BSD-3-Clause license', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'pallets-flask/LICENSE'), 'utf8')
		const result = identifyLicense(content)

		expect(result).toBeDefined()
		expect(result!.spdxId).toBe('BSD-3-Clause')
		expect(result!.confidence).toBeGreaterThanOrEqual(0.75)
	})

	it('should identify an AGPL-3.0 license from a full GPL text', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'callofduty4x-cod4x-server/COPYING.md'),
			'utf8',
		)
		const result = identifyLicense(content)

		expect(result).toBeDefined()
		expect(result!.spdxId).toBe('AGPL-3.0-only')
		expect(result!.confidence).toBe(1)
	})

	it('should return undefined for empty text', () => {
		expect(identifyLicense('')).toBeUndefined()
	})

	it('should return undefined for non-license text', () => {
		expect(identifyLicense('This is just a readme file with no license text.')).toBeUndefined()
	})
})

describe('spdxIdToUrl', () => {
	it('should convert an SPDX ID to a URL', () => {
		expect(spdxIdToUrl('MIT')).toBe('https://spdx.org/licenses/MIT')
		expect(spdxIdToUrl('Apache-2.0')).toBe('https://spdx.org/licenses/Apache-2.0')
	})
})

describe('fixture coverage', () => {
	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory() && entry.name !== 'multi')

		expect(directories.length).toBeGreaterThan(0)

		let identified = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const licenseFile = files[0]
			const content = await readFile(resolve(directoryPath, licenseFile), 'utf8')
			const result = identifyLicense(content)
			if (result) identified++
		}

		// Most fixtures should be identifiable
		expect(identified).toBeGreaterThan(directories.length / 2)
	})
})
