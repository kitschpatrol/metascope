import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	identifyLicense,
	isLicenseFilename,
	spdxIdToUrl,
} from '../../src/lib/parsers/license-file-parser'

const fixturesDirectory = resolve('test/fixtures/license')

describe('isLicenseFilename', () => {
	it('should match LICENSE variants', () => {
		expect(isLicenseFilename('LICENSE')).toBe(true)
		expect(isLicenseFilename('LICENSE.md')).toBe(true)
		expect(isLicenseFilename('LICENSE.txt')).toBe(true)
		expect(isLicenseFilename('license')).toBe(true)
		expect(isLicenseFilename('License.md')).toBe(true)
	})

	it('should match LICENCE (British spelling)', () => {
		expect(isLicenseFilename('LICENCE')).toBe(true)
		expect(isLicenseFilename('LICENCE.md')).toBe(true)
		expect(isLicenseFilename('licence')).toBe(true)
	})

	it('should match COPYING variants', () => {
		expect(isLicenseFilename('COPYING')).toBe(true)
		expect(isLicenseFilename('COPYING.md')).toBe(true)
		expect(isLicenseFilename('COPYING.txt')).toBe(true)
		expect(isLicenseFilename('copying')).toBe(true)
	})

	it('should match COPYING.LESSER variants', () => {
		expect(isLicenseFilename('COPYING.LESSER')).toBe(true)
		expect(isLicenseFilename('COPYING.LESSER.txt')).toBe(true)
	})

	it('should match UNLICENSE variants', () => {
		expect(isLicenseFilename('UNLICENSE')).toBe(true)
		expect(isLicenseFilename('unlicense')).toBe(true)
		expect(isLicenseFilename('UNLICENSE.md')).toBe(true)
	})

	it('should not match unrelated files', () => {
		expect(isLicenseFilename('README.md')).toBe(false)
		expect(isLicenseFilename('package.json')).toBe(false)
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
		const dirs = entries.filter((entry) => entry.isDirectory() && entry.name !== 'multi')

		expect(dirs.length).toBeGreaterThan(0)

		let identified = 0
		for (const dir of dirs) {
			const dirPath = resolve(fixturesDirectory, dir.name)
			const files = await readdir(dirPath)
			const licenseFile = files[0]
			const content = await readFile(resolve(dirPath, licenseFile), 'utf8')
			// Should not throw; some fixtures may be custom/proprietary and not match
			const result = identifyLicense(content)
			if (result) identified++
		}

		// Most fixtures should be identifiable
		expect(identified).toBeGreaterThan(dirs.length / 2)
	})
})
