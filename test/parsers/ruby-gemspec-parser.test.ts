import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGemspec } from '../../src/lib/parsers/gemspec-parser'

const fixturesDirectory = resolve('test/fixtures/ruby-gemspec')

describe('parseGemspec', () => {
	it('should return an object with basic gemspec fields', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = (await parseGemspec(content)) as any

		expect(result.name).toBe('blazer')
		expect(result.summary).toBeDefined()
		expect(result.homepage).toBeDefined()
		expect(result.license).toBeDefined()
	})

	it('should return an object with a dependencies array', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'ankane-blazer/blazer.gemspec'), 'utf8')
		const result = (await parseGemspec(content)) as any

		expect(Array.isArray(result.dependencies)).toBe(true)
		expect(result.dependencies.length).toBeGreaterThan(0)
		expect(result.dependencies[0]).toHaveProperty('name')
		expect(result.dependencies[0]).toHaveProperty('type')
	})

	it('should return an object with an authors array', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'adn-rb-adn/adn.gemspec'), 'utf8')
		const result = (await parseGemspec(content)) as any

		expect(Array.isArray(result.authors)).toBe(true)
		expect(result.authors.length).toBeGreaterThan(0)
	})

	it('should parse all 196 fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBe(196)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const gemspecFile = files.find((name) => name.endsWith('.gemspec'))
			if (!gemspecFile) continue

			const content = readFileSync(resolve(directoryPath, gemspecFile), 'utf8')
			await expect(parseGemspec(content)).resolves.toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(196)
	})
})
