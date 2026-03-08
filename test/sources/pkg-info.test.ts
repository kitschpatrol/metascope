import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pkgInfoSource } from '../../src/lib/sources/pkg-info'

const fixturesDirectory = resolve('test/fixtures/pkg-info')

describe('pkg-info source', () => {
	it('should be available in a directory with a PKG-INFO file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		expect(await pkgInfoSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without PKG-INFO', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pkgInfoSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		const result = await pkgInfoSource.extract(context)

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.license).toBe('MIT')
		expect(result.requires_dist).toContain('requests>=2.25.0')
	})
})
