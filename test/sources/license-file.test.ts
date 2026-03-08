import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { licenseFileSource } from '../../src/lib/sources/license-file'

const fixturesDirectory = resolve('test/fixtures/license-file')

describe('licenseFiles source', () => {
	it('should be available in a directory with a LICENSE file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'pallets-flask'),
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with a COPYING file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'pallets-flask-1'),
		}
		expect(await licenseFileSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with a LICENCE file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'ashuk032-8secread'),
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
			path: resolve(fixturesDirectory, 'pallets-flask'),
		}
		const result = await licenseFileSource.extract(context)

		expect(result.spdxUrls).toBeDefined()
		expect(result.spdxUrls!.length).toBeGreaterThanOrEqual(1)
		expect(result.spdxUrls!.some((url) => url.includes('BSD'))).toBe(true)
	})

	it('should deduplicate SPDX URLs from multiple license files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'multi'),
		}
		const result = await licenseFileSource.extract(context)

		expect(result.spdxUrls).toBeDefined()
		// The multi/ directory has LICENSE (BSD-3-Clause) and COPYING.md (GPL), should have at least 2
		expect(result.spdxUrls!.length).toBeGreaterThanOrEqual(2)
		// Should be sorted
		for (let index = 1; index < result.spdxUrls!.length; index++) {
			expect(result.spdxUrls![index] >= result.spdxUrls![index - 1]).toBe(true)
		}
	})
})
