import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { metadataFileSource } from '../../src/lib/sources/metadata'

const fixturesDir = resolve('test/fixtures/metadata')

describe('metadataFile source', () => {
	it('should be available in a directory with metadata.json', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'git-url'),
		}
		expect(await metadataFileSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with metadata.yaml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'basic'),
		}
		expect(await metadataFileSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without metadata files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await metadataFileSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from JSON', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'git-url'),
		}
		const result = await metadataFileSource.extract(context)

		expect(result.description).toBe('Testing metadata.json with git URL normalization')
		expect(result.repository).toBe('https://github.com/test/metadata-git-url')
		expect(result.keywords).toEqual(['metadata', 'git-url', 'testing'])
	})

	it('should prefer metadata.json over metadata.yaml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'basic'),
		}
		const result = await metadataFileSource.extract(context)

		// basic/ has all three formats; JSON should be preferred
		expect(result.description).toBe('JSON metadata file for testing')
	})
})
