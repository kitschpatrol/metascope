import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGoMod } from '../../src/lib/parsers/go-go-mod-parser'

const fixturesDirectory = resolve('test/fixtures/go-go-mod')

describe('parseGoMod', () => {
	it('should parse module path and go version', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.module).toBe('github.com/caddyserver/certmagic')
		expect(result.go_version).toBe('1.24.0')
	})

	it('should derive repository URL from module path', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.repository_url).toBe('https://github.com/caddyserver/certmagic')
	})

	it('should not derive repository URL for non-forge modules', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'dagger-dagger/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.module).toBe('dagger/dev')
		expect(result.repository_url).toBeUndefined()
	})

	it('should extract direct dependencies and skip indirect ones', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

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
		const result = parseGoMod(content)

		const zerossl = result.dependencies.find((d) => d.module === 'github.com/caddyserver/zerossl')
		expect(zerossl).toBeDefined()
		expect(zerossl!.version).toBe('v0.1.5')
	})

	it('should handle single-line replace directives', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'dagger-dagger/go.mod'), 'utf8')
		const result = parseGoMod(content)

		// The replace directives in dagger replace indirect deps, so they
		// shouldn't affect direct deps. Just verify parsing doesn't break.
		expect(result.dependencies.length).toBeGreaterThan(0)
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const goModFile = files.find((name) => name === 'go.mod')
			if (!goModFile) continue

			const content = readFileSync(resolve(directoryPath, goModFile), 'utf8')
			expect(() => parseGoMod(content), `fixture "${directory.name}" should parse`).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(29)
	})
})
