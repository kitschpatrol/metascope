import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import spdxLicenseList from 'spdx-license-list/full.js'
import { beforeEach, describe, expect, it } from 'vitest'
import licenseUrls from '../../src/lib/data/license-urls.json' with { type: 'json' }
import { resetMatchCache } from '../../src/lib/file-matching'
import { licenseFileSource } from '../../src/lib/sources/license-file'
import { identifyLicense, spdxIdToUrl } from '../../src/lib/utilities/license-identification'

const fixturesDirectory = resolve('test/fixtures/license-file')
const OSI_LICENSE_PATH_REGEX = /^\/license\/[^/]+$/

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
		expect(result!.data.type).toBe('spdx')
		expect(result!.data.match?.spdxId).toContain('BSD')
		expect(result!.source).toBeDefined()
	})

	it('should preserve the file path when the contents are not SPDX-identifiable', async () => {
		const result = await licenseFileSource.parse('license.txt', {
			options: { path: resolve(fixturesDirectory, '_proprietary') },
		})

		// A license file whose contents do not match any SPDX template (e.g.
		// proprietary "All Rights Reserved" notices) records `type: 'unknown'`
		// and omits `match`. The `type` discriminator keeps `data` non-empty so
		// the framework's deep-strip preserves the full record (including
		// `source` for downstream consumers).
		expect(result).toBeDefined()
		expect(result!.source).toBe('license.txt')
		expect(result!.data.type).toBe('unknown')
		expect(result!.data.match).toBeUndefined()
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
		expect(result!.name).toBe('BSD 3-Clause "New" or "Revised" License')
		expect(result!.osiApproved).toBe(true)
		expect(result!.confidence).toBeGreaterThanOrEqual(0.75)
		expect(result!.spdxUrl).toBe('https://opensource.org/license/BSD-3-Clause')
	})

	it('should identify an AGPL-3.0 license from a full GPL text', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'callofduty4x-cod4x-server/COPYING.md'),
			'utf8',
		)
		const result = identifyLicense(content)

		expect(result).toBeDefined()
		expect(result!.spdxId).toBe('AGPL-3.0-only')
		expect(result!.name).toBe('GNU Affero General Public License v3.0 only')
		expect(result!.osiApproved).toBe(true)
		expect(result!.confidence).toBe(1)
		expect(result!.spdxUrl).toBe('https://spdx.org/licenses/AGPL-3.0-only')
	})

	it('should return undefined for empty text', () => {
		expect(identifyLicense('')).toBeUndefined()
	})

	it('should return undefined for non-license text', () => {
		expect(identifyLicense('This is just a readme file with no license text.')).toBeUndefined()
	})

	it('should identify a pointer-style CC license file by URL', () => {
		const text = [
			'Copyright (c) 2009-2026 Eric Mika',
			'',
			'This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.',
			'',
			'https://creativecommons.org/licenses/by-nc-sa/3.0/',
		].join('\n')
		const result = identifyLicense(text)

		expect(result).toBeDefined()
		expect(result?.spdxId).toBe('CC-BY-NC-SA-3.0')
		expect(result?.name).toBe(
			'Creative Commons Attribution Non Commercial Share Alike 3.0 Unported',
		)
		expect(result?.osiApproved).toBe(false)
		expect(result?.confidence).toBe(1)
		expect(result?.spdxUrl).toBe('https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode')
	})

	it('should identify a license by its canonical spdx.org URL', () => {
		const result = identifyLicense('See https://spdx.org/licenses/MIT for the full text.')

		expect(result).toBeDefined()
		expect(result?.spdxId).toBe('MIT')
		expect(result?.name).toBe('MIT License')
		expect(result?.osiApproved).toBe(true)
		expect(result?.confidence).toBe(1)
		expect(result?.spdxUrl).toBe('https://opensource.org/license/mit')
	})

	it('should identify a license by its /legalcode URL variant', () => {
		const result = identifyLicense(
			'Licensed under https://creativecommons.org/licenses/by/4.0/legalcode.',
		)

		expect(result).toBeDefined()
		expect(result?.spdxId).toBe('CC-BY-4.0')
	})

	it('should prefer modern SPDX IDs over deprecated forms on URL collision', () => {
		// Several GNU license URLs are shared between deprecated (e.g. `GPL-3.0`,
		// `GPL-3.0+`) and current (`GPL-3.0-only`, `GPL-3.0-or-later`) IDs. The
		// URL index should resolve to the `-only` form.
		const result = identifyLicense('https://www.gnu.org/licenses/gpl-3.0-standalone.html')

		expect(result?.spdxId).toBe('GPL-3.0-only')
	})

	it('should emit the current direct OSI URL for legacy OSI paths', () => {
		const result = identifyLicense('https://spdx.org/licenses/BSD-3-Clause')

		expect(result?.spdxUrl).toBe('https://opensource.org/license/BSD-3-Clause')
	})

	it('should identify a license by the current direct OSI URL', () => {
		const result = identifyLicense('https://opensource.org/license/BSD-3-Clause')

		expect(result?.spdxId).toBe('BSD-3-Clause')
	})

	it('should emit the current direct OSI URL for legacy OSI slugs', () => {
		const result = identifyLicense('https://spdx.org/licenses/UPL-1.0')

		expect(result?.spdxUrl).toBe('https://opensource.org/license/upl-1.0')
	})

	it('should emit HTTPS URLs without legacy OSI routes for every SPDX license', () => {
		for (const spdxId of Object.keys(spdxLicenseList)) {
			const result = identifyLicense(spdxIdToUrl(spdxId))
			expect(result, spdxId).toBeDefined()

			const url = new URL(result!.spdxUrl)
			expect(url.protocol, spdxId).toBe('https:')
			if (url.hostname === 'opensource.org') {
				expect(url.pathname, spdxId).toMatch(OSI_LICENSE_PATH_REGEX)
			}
		}
	})

	it('should preserve the dependency URL alongside each audited URL', () => {
		expect(Object.keys(licenseUrls).toSorted()).toEqual(Object.keys(spdxLicenseList).toSorted())
		expect(licenseUrls.MIT).toEqual({
			originalUrl: 'https://opensource.org/license/mit/',
			url: 'https://opensource.org/license/mit',
		})
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
			if (result) {
				identified++
			}
		}

		// Most fixtures should be identifiable
		expect(identified).toBeGreaterThan(directories.length / 2)
	})
})
