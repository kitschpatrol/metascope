import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	extractRfc822Body,
	parseRfc822Headers,
	splitMultiValues,
} from '../../src/lib/parsers/rfc822-header-parser'

const fixturesDirectory = resolve('test/fixtures/python-pkg-info')

describe('parseRfc822Headers', () => {
	it('should parse header key-value pairs', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const headers = parseRfc822Headers(content)

		expect(headers.Name).toBe('example-package')
		expect(headers.Version).toBe('1.2.3')
		expect(headers.Summary).toBe('A short description of the package')
		expect(headers.Author).toBe('Jane Smith')
		expect(headers.License).toBe('MIT')
	})

	it('should collect multi-value headers as newline-separated strings', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const headers = parseRfc822Headers(content)

		const classifiers = splitMultiValues(headers.Classifier)
		expect(classifiers).toContain('Development Status :: 5 - Production/Stable')
		expect(classifiers).toContain('Programming Language :: Python :: 3')
		expect(classifiers.length).toBe(5)
	})

	it('should collect Requires-Dist as multi-value', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const headers = parseRfc822Headers(content)

		const requiresDistribution = splitMultiValues(headers['Requires-Dist'])
		expect(requiresDistribution).toContain('requests>=2.25.0')
		expect(requiresDistribution).toContain('click>=7.0')
		expect(requiresDistribution).toContain('pyyaml')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const pkgInfoFile = files.find((name) => name === 'PKG-INFO')
			if (!pkgInfoFile) continue

			const content = readFileSync(resolve(directoryPath, pkgInfoFile), 'utf8')
			expect(
				() => parseRfc822Headers(content),
				`fixture "${directory.name}" should parse`,
			).not.toThrow()
			parsedCount++
		}

		expect(parsedCount).toBe(109)
	})
})

describe('extractRfc822Body', () => {
	it('should extract body text after the first blank line', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const body = extractRfc822Body(content)

		expect(body).toBeDefined()
		expect(body).toContain('Example Package')
	})

	it('should return undefined when there is no body', () => {
		const headerOnly = 'Name: test\nVersion: 1.0'
		expect(extractRfc822Body(headerOnly)).toBeUndefined()
	})
})

describe('splitMultiValues', () => {
	it('should split newline-separated values into an array', () => {
		expect(splitMultiValues('a\nb\nc')).toEqual(['a', 'b', 'c'])
	})

	it('should return an empty array for undefined', () => {
		expect(splitMultiValues()).toEqual([])
	})
})
