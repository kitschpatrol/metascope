import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGemspec } from '../../src/lib/parsers/gemspec-parser'

const fixturesDir = resolve('test/fixtures/ruby-gemspec')

describe('parseGemspec', () => {
	it('should parse basic fields from ankane-blazer', async () => {
		const content = readFileSync(resolve(fixturesDir, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = await parseGemspec(content)

		expect(result.name).toBe('blazer')
		expect(result.summary).toBe(
			'Explore your data with SQL. Easily create charts and dashboards, and share them with your team.',
		)
		expect(result.homepage).toBe('https://github.com/ankane/blazer')
		expect(result.license).toBe('MIT')
		expect(result.extra).toHaveProperty('author')
		expect(result.required_ruby_version).toBe('>= 3.2')
	})

	it('should parse dependencies from ankane-blazer', async () => {
		const content = readFileSync(resolve(fixturesDir, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = await parseGemspec(content)

		expect(result.dependencies.length).toBeGreaterThanOrEqual(4)
		const railties = result.dependencies.find((d) => d.name === 'railties')
		expect(railties).toBeDefined()
		expect(railties!.type).toBe('runtime')
		expect(railties!.requirements).toContain('>= 7.1')
	})

	it('should parse authors array from adn-rb-adn', async () => {
		const content = readFileSync(resolve(fixturesDir, 'adn-rb-adn/adn.gemspec'), 'utf8')
		const result = await parseGemspec(content)

		expect(result.name).toBe('adn')
		expect(result.authors).toEqual(['Kishyr Ramdial', 'Dave Goodchild', 'Peter Hellberg'])
		expect(result.email).toEqual(['kishyr@gmail.com', 'buddhamagnet@gmail.com', 'peter@c7.se'])
		expect(result.required_ruby_version).toBe('>= 1.9.3')
	})

	it('should parse runtime dependencies from adn-rb-adn', async () => {
		const content = readFileSync(resolve(fixturesDir, 'adn-rb-adn/adn.gemspec'), 'utf8')
		const result = await parseGemspec(content)

		const multipartPost = result.dependencies.find((d) => d.name === 'multipart-post')
		expect(multipartPost).toBeDefined()
		expect(multipartPost!.type).toBe('runtime')

		const mimeTypes = result.dependencies.find((d) => d.name === 'mime-types')
		expect(mimeTypes).toBeDefined()
		expect(mimeTypes!.type).toBe('runtime')
	})

	it('should distinguish dev vs runtime dependencies from bigbinary-mail-interceptor', async () => {
		const content = readFileSync(
			resolve(fixturesDir, 'bigbinary-mail-interceptor/mail_interceptor.gemspec'),
			'utf8',
		)
		const result = await parseGemspec(content)

		const runtimeDeps = result.dependencies.filter((d) => d.type === 'runtime')
		const devDeps = result.dependencies.filter((d) => d.type === 'development')

		expect(runtimeDeps.length).toBeGreaterThanOrEqual(2)
		expect(devDeps.length).toBeGreaterThanOrEqual(4)

		expect(runtimeDeps.find((d) => d.name === 'activesupport')).toBeDefined()
		expect(devDeps.find((d) => d.name === 'bundler')).toBeDefined()
		expect(devDeps.find((d) => d.name === 'minitest')).toBeDefined()
	})

	it('should parse all 196 fixtures without throwing', async () => {
		const entries = await readdir(fixturesDir, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBe(196)

		let parsedCount = 0
		for (const dir of directories) {
			const dirPath = resolve(fixturesDir, dir.name)
			const files = await readdir(dirPath)
			const gemspecFile = files.find((name) => name.endsWith('.gemspec'))
			if (!gemspecFile) continue

			const content = readFileSync(resolve(dirPath, gemspecFile), 'utf8')
			await expect(parseGemspec(content)).resolves.toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(196)
	})
})
