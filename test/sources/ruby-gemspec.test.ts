import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { parse, rubyGemspecSource } from '../../src/lib/sources/ruby-gemspec'

const fixturesDirectory = resolve('test/fixtures/ruby-gemspec')

describe('rubyGemspec source', () => {
	it('should be available in a directory with a .gemspec file', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'ankane-blazer'),
		}
		expect(await rubyGemspecSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without .gemspec files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await rubyGemspecSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'ankane-blazer'),
		}
		const result = await rubyGemspecSource.extract(context)

		expect(result.name).toBe('blazer')
		expect(result.license).toBe('MIT')
		expect(result.homepage).toBe('https://github.com/ankane/blazer')
		expect(result.dependencies?.length).toBeGreaterThanOrEqual(4)
	})
})

describe('parse', () => {
	it('should parse basic fields from ankane-blazer', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = await parse(content)

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
		const content = readFileSync(resolve(fixturesDirectory, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = await parse(content)

		expect(result.dependencies.length).toBeGreaterThanOrEqual(4)
		const railties = result.dependencies.find((d) => d.name === 'railties')
		expect(railties).toBeDefined()
		expect(railties!.type).toBe('runtime')
		expect(railties!.requirements).toContain('>= 7.1')
	})

	it('should parse authors array from adn-rb-adn', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'adn-rb-adn/adn.gemspec'), 'utf8')
		const result = await parse(content)

		expect(result.name).toBe('adn')
		expect(result.authors).toEqual(['Kishyr Ramdial', 'Dave Goodchild', 'Peter Hellberg'])
		expect(result.email).toEqual(['kishyr@gmail.com', 'buddhamagnet@gmail.com', 'peter@c7.se'])
		expect(result.required_ruby_version).toBe('>= 1.9.3')
	})

	it('should parse runtime dependencies from adn-rb-adn', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'adn-rb-adn/adn.gemspec'), 'utf8')
		const result = await parse(content)

		const multipartPost = result.dependencies.find((d) => d.name === 'multipart-post')
		expect(multipartPost).toBeDefined()
		expect(multipartPost!.type).toBe('runtime')

		const mimeTypes = result.dependencies.find((d) => d.name === 'mime-types')
		expect(mimeTypes).toBeDefined()
		expect(mimeTypes!.type).toBe('runtime')
	})

	it('should distinguish dev vs runtime dependencies from bigbinary-mail-interceptor', async () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'bigbinary-mail-interceptor/mail_interceptor.gemspec'),
			'utf8',
		)
		const result = await parse(content)

		const runtimeDependencies = result.dependencies.filter((d) => d.type === 'runtime')
		const developmentDependencies = result.dependencies.filter((d) => d.type === 'development')

		expect(runtimeDependencies.length).toBeGreaterThanOrEqual(2)
		expect(developmentDependencies.length).toBeGreaterThanOrEqual(4)

		expect(runtimeDependencies.find((d) => d.name === 'activesupport')).toBeDefined()
		expect(developmentDependencies.find((d) => d.name === 'bundler')).toBeDefined()
		expect(developmentDependencies.find((d) => d.name === 'minitest')).toBeDefined()
	})
})
