import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { publiccodeSource } from '../../src/lib/sources/publiccode'

const fixturesDir = resolve('test/fixtures/publiccode')

describe('publiccode source', () => {
	it('should be available in a directory with publiccode.yml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'cisofy-lynis'),
		}
		expect(await publiccodeSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with publiccode.yaml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'commongateway-corebundle'),
		}
		expect(await publiccodeSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without publiccode files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await publiccodeSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a .yml fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'cisofy-lynis'),
		}
		const result = await publiccodeSource.extract(context)

		expect(result.name).toBe('Lynis')
		expect(result.license).toBe('AGPL-3.0-only')
		expect(result.platforms).toContain('linux')
	})

	it('should extract parsed metadata from a .yaml fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'commongateway-corebundle'),
		}
		const result = await publiccodeSource.extract(context)

		expect(result.name).toBe('CoreBundle')
		expect(result.license).toBe('EUPL-1.2-or-later')
		expect(result.dependencies?.length).toBe(1)
	})
})
