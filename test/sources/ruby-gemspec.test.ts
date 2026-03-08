import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { rubyGemspecSource } from '../../src/lib/sources/ruby-gemspec'

const fixturesDirectory = resolve('test/fixtures/ruby-gemspec')

describe('rubyGemspec source', () => {
	it('should be available in a directory with a .gemspec file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'ankane-blazer'),
		}
		expect(await rubyGemspecSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without .gemspec files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await rubyGemspecSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'ankane-blazer'),
		}
		const result = await rubyGemspecSource.extract(context)

		expect(result.name).toBe('blazer')
		expect(result.license).toBe('MIT')
		expect(result.homepage).toBe('https://github.com/ankane/blazer')
		expect(result.dependencies?.length).toBeGreaterThanOrEqual(4)
	})
})
