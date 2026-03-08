import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseConfigparser, splitMultiline } from '../../src/lib/parsers/configparser-parser'

const fixturesDirectory = resolve('test/fixtures/python-setup-cfg')

describe('parseConfigparser', () => {
	it('should parse sections with key-value pairs', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const sections = parseConfigparser(content)

		expect(sections.metadata).toBeDefined()
		expect(sections.metadata.name).toBe('example-package')
		expect(sections.metadata.version).toBe('1.2.3')
		expect(sections.metadata.author).toBe('Jane Smith')
	})

	it('should parse multiple sections', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const sections = parseConfigparser(content)

		expect(sections.metadata).toBeDefined()
		expect(sections.options).toBeDefined()
	})

	it('should handle multi-line continuation values', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const sections = parseConfigparser(content)

		const classifiers = splitMultiline(sections.metadata.classifiers)
		expect(classifiers.length).toBeGreaterThan(0)
		expect(classifiers).toContain('Development Status :: 5 - Production/Stable')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const setupCfgFile = files.find((name) => name === 'setup.cfg')
			if (!setupCfgFile) continue

			const content = readFileSync(resolve(directoryPath, setupCfgFile), 'utf8')
			expect(
				() => parseConfigparser(content),
				`fixture "${directory.name}" should parse`,
			).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(13)
	})
})

describe('splitMultiline', () => {
	it('should split newline-separated values into an array', () => {
		expect(splitMultiline('a\nb\nc')).toEqual(['a', 'b', 'c'])
	})

	it('should filter empty lines', () => {
		expect(splitMultiline('a\n\nb')).toEqual(['a', 'b'])
	})
})
