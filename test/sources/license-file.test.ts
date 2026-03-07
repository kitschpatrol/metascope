import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { licenseFileSource } from '../../src/lib/sources/license-file'

const fixturesDir = resolve('test/fixtures/license')

describe('licenseFiles source', () => {
	it('should be available in a directory with a LICENSE file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'pallets-flask'),
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with a COPYING file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'pallets-flask-1'),
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with a LICENCE file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'ashuk032-8secread'),
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without license files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(false)
	})

	it('should extract SPDX URLs from a single license file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'pallets-flask'),
		}
		const result = await licenseFileSource.extract(context)

		expect(result.spdxUrls).toBeDefined()
		expect(result.spdxUrls!.length).toBeGreaterThanOrEqual(1)
		expect(result.spdxUrls!.some((url) => url.includes('BSD'))).toBe(true)
	})

	it('should deduplicate SPDX URLs from multiple license files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'multi'),
		}
		const result = await licenseFileSource.extract(context)

		expect(result.spdxUrls).toBeDefined()
		// multi/ has LICENSE (BSD-3-Clause) and COPYING.md (GPL), should have at least 2
		expect(result.spdxUrls!.length).toBeGreaterThanOrEqual(2)
		// Should be sorted
		for (let i = 1; i < result.spdxUrls!.length; i++) {
			expect(result.spdxUrls![i] >= result.spdxUrls![i - 1]).toBe(true)
		}
	})
})
