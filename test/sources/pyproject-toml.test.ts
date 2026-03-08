import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pyprojectSource } from '../../src/lib/sources/pyproject-toml'

const fixturesDirectory = resolve('test/fixtures/pyproject')

describe('pyproject-toml source', () => {
	it('should be available in a directory with a pyproject.toml file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		expect(await pyprojectSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without pyproject.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pyprojectSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		const result = await pyprojectSource.extract(context)

		expect(result.project?.name).toBe('codemetapy')
		expect(result.project?.version).toBe('2.5.3')
		expect(result.project?.dependencies).toContain('rdflib>=6.0.0')
	})
})
