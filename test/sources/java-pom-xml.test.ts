import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { javaPomXmlSource } from '../../src/lib/sources/java-pom-xml'

const fixturesDirectory = resolve('test/fixtures/java-pom-xml')

describe('javaPomXml source', () => {
	it('should be available in a directory with pom.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'yahoo-halodb'),
		}
		expect(await javaPomXmlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without pom.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await javaPomXmlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'yahoo-halodb'),
		}
		const result = await javaPomXmlSource.extract(context)

		expect(result.name).toBe('HaloDB')
		expect(result.groupId).toBe('com.oath.halodb')
		expect(result.artifactId).toBe('halodb')
		expect(result.developers).toHaveLength(1)
		expect(result.developers![0].name).toBe('Arjun Mannaly')
	})
})
