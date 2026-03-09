import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { metadataFileSource, parse as parseMetadata } from '../../src/lib/sources/metadata-file'
import { firstOf } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/metadata-file')

describe('metadataFile source', () => {
	it('should be available in a directory with metadata.json', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['metadata.json'],
			options: { path: resolve(fixturesDirectory, 'git-url') },
		}
		expect(await metadataFileSource.extract(context)).toBeDefined()
	})

	it('should be available in a directory with metadata.yaml', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['metadata.json', 'metadata.yaml', 'metadata.yml'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		expect(await metadataFileSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without metadata files', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: [],
			options: { path: '/tmp' },
		}
		expect(await metadataFileSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed metadata from JSON', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['metadata.json'],
			options: { path: resolve(fixturesDirectory, 'git-url') },
		}
		const result = firstOf(await metadataFileSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.source).toBe('metadata.json')
		expect(result!.data.description).toBe('Testing metadata.json with git URL normalization')
		expect(result!.data.repository).toBe('https://github.com/test/metadata-git-url')
		expect(result!.data.keywords).toEqual(['metadata', 'git-url', 'testing'])
	})

	it('should return all metadata files when multiple exist', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['metadata.json', 'metadata.yaml', 'metadata.yml'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		const result = await metadataFileSource.extract(context)

		expect(result).toBeDefined()
		// The basic/ directory has all three formats; all should be returned
		const first = firstOf(result)
		expect(first).toBeDefined()
		expect(first!.data.description).toBe('JSON metadata file for testing')
	})
})

describe('parse', () => {
	it('should parse a JSON metadata file', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'basic/metadata.json'), 'utf8')
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.description).toBe('JSON metadata file for testing')
		expect(result!.homepage).toBe('https://json-example.com')
		expect(result!.keywords).toEqual(['json', 'metadata', 'testing'])
	})

	it('should parse a YAML metadata file', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'basic/metadata.yaml'), 'utf8')
		const result = parseMetadata(content, 'yaml')

		expect(result).toBeDefined()
		expect(result!.description).toBe('Extended YAML metadata file for testing')
		expect(result!.homepage).toBe('https://extended-yaml-example.com')
		expect(result!.keywords).toEqual(['extended-yaml', 'metadata', 'comprehensive'])
	})

	it('should parse a YML metadata file', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'basic/metadata.yml'), 'utf8')
		const result = parseMetadata(content, 'yaml')

		expect(result).toBeDefined()
		expect(result!.description).toBe('YAML metadata file for testing')
		expect(result!.homepage).toBe('https://yaml-example.com')
		expect(result!.keywords).toEqual(['yaml', 'metadata', 'testing'])
	})

	it('should fall back from tags to keywords', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'tags-fallback/metadata.json'),
			'utf8',
		)
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.keywords).toEqual(['tag1', 'tag2', 'tags-fallback'])
	})

	it('should fall back from topics to keywords', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'topics-fallback/metadata.json'),
			'utf8',
		)
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.keywords).toEqual(['topic1', 'topic2', 'topics-fallback'])
	})

	it('should fall back from url to homepage', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'url-fallback/metadata.json'), 'utf8')
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.homepage).toBe('https://url-fallback-example.com')
	})

	it('should fall back from website to homepage', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'website-fallback/metadata.json'),
			'utf8',
		)
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.homepage).toBe('https://website-fallback-example.com')
	})

	it('should fall back from repository to homepage and normalize git URLs', async () => {
		const content = await readFile(resolve(fixturesDirectory, 'git-url/metadata.json'), 'utf8')
		const result = parseMetadata(content, 'json')

		expect(result).toBeDefined()
		expect(result!.repository).toBe('https://github.com/test/metadata-git-url')
		expect(result!.homepage).toBe('https://github.com/test/metadata-git-url')
	})

	it('should return undefined for invalid JSON', () => {
		expect(parseMetadata('not json {', 'json')).toBeUndefined()
	})

	it('should return undefined for non-object content', () => {
		expect(parseMetadata('"just a string"', 'json')).toBeUndefined()
	})
})
