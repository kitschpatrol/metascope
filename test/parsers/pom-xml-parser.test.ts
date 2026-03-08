import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePomXml } from '../../src/lib/parsers/pom-xml-parser'

const fixturesDirectory = resolve('test/fixtures/pom-xml')

describe('parsePomXml', () => {
	it('should parse basic project coordinates and metadata', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'yahoo-halodb/pom.xml'), 'utf8')
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.groupId).toBe('com.oath.halodb')
		expect(result!.artifactId).toBe('halodb')
		expect(result!.identifier).toBe('com.oath.halodb.halodb')
		expect(result!.name).toBe('HaloDB')
		expect(result!.version).toBe('0.5.6')
		expect(result!.description).toBe('A fast, embedded, persistent key-value storage engine.')
		expect(result!.url).toBe('http://maven.apache.org')
	})

	it('should parse developers with email, url, and organization', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'pennstate-alexa-tools/pom.xml'),
			'utf8',
		)
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.developers).toHaveLength(3)
		expect(result!.developers[0]).toEqual({
			email: 'ses44@psu.edu',
			name: 'Shawn Smith',
			organization: 'The Pennsylvania State University',
			url: 'https://github.com/ussmith',
		})
	})

	it('should parse licenses', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'pennstate-alexa-tools/pom.xml'),
			'utf8',
		)
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.licenses).toHaveLength(1)
		expect(result!.licenses[0]).toEqual({
			name: 'The Apache License, Version 2.0',
			url: 'http://www.apache.org/licenses/LICENSE-2.0.txt',
		})
	})

	it('should separate test-scope dependencies into devDependencies', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'yahoo-halodb/pom.xml'), 'utf8')
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		// Non-test deps
		expect(result!.dependencies.some((d) => d.artifactId === 'guava')).toBe(true)
		expect(result!.dependencies.some((d) => d.artifactId === 'slf4j-api')).toBe(true)
		// Test deps
		expect(result!.devDependencies.some((d) => d.artifactId === 'testng')).toBe(true)
		expect(result!.devDependencies.some((d) => d.artifactId === 'hamcrest-all')).toBe(true)
	})

	it('should parse SCM URL', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'yahoo-halodb/pom.xml'), 'utf8')
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.scmUrl).toBe('https://github.com/yahoo/HaloDB')
	})

	it('should extract java version from properties', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'metersphere-metersphere/pom.xml'),
			'utf8',
		)
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.javaVersion).toBe('21')
	})

	it('should resolve Maven variable references in name', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'r351574nc3-cartographer/pom.xml'),
			'utf8',
		)
		const result = parsePomXml(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('com.github.r351574nc3.nexus:nexus-parent')
	})

	it('should return undefined for invalid XML', () => {
		expect(parsePomXml('not xml <{')).toBeUndefined()
	})

	it('should return undefined for XML without project root', () => {
		expect(parsePomXml('<root><item>test</item></root>')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory())

		expect(dirs.length).toBeGreaterThan(0)

		for (const dir of dirs) {
			const content = await readFile(resolve(fixturesDirectory, dir.name, 'pom.xml'), 'utf8')
			const result = parsePomXml(content)
			expect(result, `fixture "${dir.name}" should parse`).toBeDefined()
		}
	})
})
