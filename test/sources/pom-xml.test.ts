import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { pomXmlSource } from '../../src/lib/sources/pom-xml'

const fixturesDir = resolve('test/fixtures/pom-xml')

describe('pomXml source', () => {
	it('should be available in a directory with pom.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'yahoo-halodb'),
		}
		expect(await pomXmlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without pom.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await pomXmlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'yahoo-halodb'),
		}
		const result = await pomXmlSource.extract(context)

		expect(result.name).toBe('HaloDB')
		expect(result.groupId).toBe('com.oath.halodb')
		expect(result.artifactId).toBe('halodb')
		expect(result.developers).toHaveLength(1)
		expect(result.developers![0].name).toBe('Arjun Mannaly')
	})
})
