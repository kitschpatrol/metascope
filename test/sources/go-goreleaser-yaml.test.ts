import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { goGoreleaserYamlSource } from '../../src/lib/sources/go-goreleaser-yaml'

const fixturesDirectory = resolve('test/fixtures/go-goreleaser-yaml')

describe('goGoreleaserYaml source', () => {
	it('should be available in a directory with a .goreleaser.yml file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aenthill-aenthill'),
		}
		expect(await goGoreleaserYamlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without goreleaser config', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await goGoreleaserYamlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'aenthill-aenthill'),
		}
		const result = await goGoreleaserYamlSource.extract(context)

		expect(result.project_name).toBe('Aenthill')
		expect(result.homepage).toBe('https://aenthill.github.io/')
		expect(result.license).toBe('MIT')
		expect(result.operating_systems).toContain('Linux')
	})
})
