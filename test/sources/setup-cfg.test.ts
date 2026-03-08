import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { setupCfgSource } from '../../src/lib/sources/setup-cfg'

const fixturesDirectory = resolve('test/fixtures/setup-cfg')

describe('setup-cfg source', () => {
	it('should be available in a directory with a setup.cfg file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		expect(await setupCfgSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without setup.cfg', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await setupCfgSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		const result = await setupCfgSource.extract(context)

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.license).toBe('MIT')
		expect(result.install_requires).toContain('requests>=2.25.0')
	})
})
