import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { goreleaserSource } from '../../src/lib/sources/goreleaser'

const fixturesDirectory = resolve('test/fixtures/goreleaser')

describe('goreleaser source', () => {
	it('should be available in a directory with a .goreleaser.yml file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aenthill-aenthill'),
		}
		expect(await goreleaserSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without goreleaser config', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await goreleaserSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aenthill-aenthill'),
		}
		const result = await goreleaserSource.extract(context)

		expect(result.project_name).toBe('Aenthill')
		expect(result.homepage).toBe('https://aenthill.github.io/')
		expect(result.license).toBe('MIT')
		expect(result.operating_systems).toContain('Linux')
	})
})
