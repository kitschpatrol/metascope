import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { parse, rubyGemspecSource } from '../../src/lib/sources/ruby-gemspec'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/ruby-gemspec')

describe('rubyGemspec source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a .gemspec file', async () => {
		expect(
			await rubyGemspecSource.getInputs({
				options: { path: resolve(fixturesDirectory, 'ankane-blazer') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without .gemspec files', async () => {
		expect(
			await rubyGemspecSource.getInputs({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await rubyGemspecSource.parseInput('blazer.gemspec', {
			options: { path: resolve(fixturesDirectory, 'ankane-blazer') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('blazer')
		expect(result!.data.license).toBe('MIT')
		expect(result!.data.homepage).toBe('https://github.com/ankane/blazer')
		expect(result!.data.dependencies.length).toBeGreaterThanOrEqual(4)
		expect(result!.source).toContain('.gemspec')
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
