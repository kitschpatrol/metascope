import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pythonPyprojectTomlSource } from '../../src/lib/sources/python-pyproject-toml'

const fixturesDirectory = resolve('test/fixtures/python-pyproject-toml')

describe('pythonPyprojectToml source', () => {
	it('should be available in a directory with a pyproject.toml file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		expect(await pythonPyprojectTomlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without pyproject.toml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pythonPyprojectTomlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'proycon-codemetapy'),
		}
		const result = await pythonPyprojectTomlSource.extract(context)

		expect(result.project?.name).toBe('codemetapy')
		expect(result.project?.version).toBe('2.5.3')
		expect(result.project?.dependencies).toContain('rdflib>=6.0.0')
	})
})
