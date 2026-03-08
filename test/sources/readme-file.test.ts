import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { readmeFileSource } from '../../src/lib/sources/readme-file'

const fixturesDirectory = resolve('test/fixtures/readme-file')

describe('readmeFile source', () => {
	it('should be available in a directory with a README.md', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'modallmedia-hyperspeed-sdk'),
		}
		expect(await readmeFileSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without README files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await readmeFileSource.isAvailable(context)).toBe(false)
	})

	it('should extract name from a fixture with an H1', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'modallmedia-hyperspeed-sdk'),
		}
		const result = await readmeFileSource.extract(context)

		expect(result.name).toBe('Hyperspeed SDK V1.0.0')
	})

	it('should return empty object for a fixture without an H1', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'next-hat-nanocl'),
		}
		const result = await readmeFileSource.extract(context)

		expect(result.name).toBeUndefined()
	})
})
