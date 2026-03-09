import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { goGoModSource, parse } from '../../src/lib/sources/go-go-mod'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/go-go-mod')

describe('goGoMod source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a go.mod file', async () => {
		expect(
			await goGoModSource.getInputs({
				metadata: {},
				options: { path: resolve(fixturesDirectory, 'caddyserver-certmagic') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without go.mod', async () => {
		expect(
			await goGoModSource.getInputs({
				metadata: {},
				options: { path: resolve('test/fixtures/_empty') },
			}),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await goGoModSource.parseInput('go.mod', {
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'caddyserver-certmagic') },
		})

		expect(result).toBeDefined()
		expect(result!.data.module).toBe('github.com/caddyserver/certmagic')
		expect(result!.data.go_version).toBe('1.24.0')
		expect(result!.data.repository_url).toBe('https://github.com/caddyserver/certmagic')
		expect(result!.data.dependencies.length).toBeGreaterThan(5)
	})
})

describe('parse', () => {
	it('should parse module path and go version', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parse(content)

		expect(result.module).toBe('github.com/caddyserver/certmagic')
		expect(result.go_version).toBe('1.24.0')
	})

	it('should derive repository URL from module path', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parse(content)

		expect(result.repository_url).toBe('https://github.com/caddyserver/certmagic')
	})

	it('should not derive repository URL for non-forge modules', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'dagger-dagger/go.mod'), 'utf8')
		const result = parse(content)

		expect(result.module).toBe('dagger/dev')
		expect(result.repository_url).toBeUndefined()
	})

	it('should extract direct dependencies and skip indirect ones', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parse(content)

		const depNames = result.dependencies.map((d) => d.module)
		expect(depNames).toContain('github.com/caddyserver/zerossl')
		expect(depNames).toContain('github.com/miekg/dns')
		expect(depNames).toContain('go.uber.org/zap')
		// Indirect deps should be excluded
		expect(depNames).not.toContain('go.uber.org/multierr')
		expect(depNames).not.toContain('golang.org/x/mod')
	})

	it('should include version in dependencies', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parse(content)

		const zerossl = result.dependencies.find((d) => d.module === 'github.com/caddyserver/zerossl')
		expect(zerossl).toBeDefined()
		expect(zerossl!.version).toBe('v0.1.5')
	})

	it('should handle single-line replace directives', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'dagger-dagger/go.mod'), 'utf8')
		const result = parse(content)

		// The replace directives in dagger replace indirect deps, so they
		// shouldn't affect direct deps. Just verify parsing doesn't break.
		expect(result.dependencies.length).toBeGreaterThan(0)
	})
})
