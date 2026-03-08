import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { readmeSource } from '../../src/lib/sources/readme'

const fixturesDir = resolve('test/fixtures/readme')

describe('readme source', () => {
	it('should be available in a directory with a README.md', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'modallmedia-hyperspeed-sdk'),
		}
		expect(await readmeSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without README files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await readmeSource.isAvailable(context)).toBe(false)
	})

	it('should extract name from a fixture with an H1', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'modallmedia-hyperspeed-sdk'),
		}
		const result = await readmeSource.extract(context)

		expect(result.name).toBe('Hyperspeed SDK V1.0.0')
	})

	it('should return empty object for a fixture without an H1', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'next-hat-nanocl'),
		}
		const result = await readmeSource.extract(context)

		expect(result.name).toBeUndefined()
	})
})
