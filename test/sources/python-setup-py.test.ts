import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pythonSetupPySource } from '../../src/lib/sources/python-setup-py'

const fixturesDirectory = resolve('test/fixtures/python-setup-py')

describe('python-setup-py source', () => {
	it('should be available in a directory with a setup.py file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		expect(await pythonSetupPySource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without setup.py', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pythonSetupPySource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'basic'),
		}
		const result = await pythonSetupPySource.extract(context)

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.license).toBe('MIT')
		expect(result.install_requires).toContain('requests>=2.25.0')
	})
})
