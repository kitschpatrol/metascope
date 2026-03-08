import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { goModSource } from '../../src/lib/sources/go-mod'

const fixturesDirectory = resolve('test/fixtures/go-mod')

describe('go-mod source', () => {
	it('should be available in a directory with a go.mod file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'caddyserver-certmagic'),
		}
		expect(await goModSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without go.mod', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await goModSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'caddyserver-certmagic'),
		}
		const result = await goModSource.extract(context)

		expect(result.module).toBe('github.com/caddyserver/certmagic')
		expect(result.go_version).toBe('1.24.0')
		expect(result.repository_url).toBe('https://github.com/caddyserver/certmagic')
		expect(result.dependencies?.length).toBeGreaterThan(5)
	})
})
