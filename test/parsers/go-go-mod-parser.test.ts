import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGoMod } from '../../src/lib/parsers/go-mod-parser'

const fixturesDirectory = resolve('test/fixtures/go-go-mod')

describe('parseGoMod', () => {
	it('should return an object with module and go_version fields', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.module).toBe('github.com/caddyserver/certmagic')
		expect(result.go_version).toBe('1.24.0')
	})

	it('should return an object with a dependencies array', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.dependencies).toBeDefined()
		expect(result.dependencies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					// eslint-disable-next-line ts/no-unsafe-assignment
					module: expect.stringContaining(''),
					// eslint-disable-next-line ts/no-unsafe-assignment
					version: expect.stringContaining(''),
				}),
			]),
		)
	})

	it('should return repository_url when module is on a known host', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'caddyserver-certmagic/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.repository_url).toBe('https://github.com/caddyserver/certmagic')
	})

	it('should return undefined repository_url for non-forge modules', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'dagger-dagger/go.mod'), 'utf8')
		const result = parseGoMod(content)

		expect(result.repository_url).toBeUndefined()
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
