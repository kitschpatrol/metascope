import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { parse, pythonPkgInfoSource } from '../../src/lib/sources/python-pkg-info'
import { firstOf } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/python-pkg-info')

describe('pythonPkgInfo source', () => {
	it('should be available in a directory with a PKG-INFO file', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['PKG-INFO'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		expect(await pythonPkgInfoSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without PKG-INFO', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: [],
			options: { path: '/tmp' },
		}
		expect(await pythonPkgInfoSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['PKG-INFO'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		const result = firstOf(await pythonPkgInfoSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.source).toBe('PKG-INFO')
		expect(result!.data.name).toBe('example-package')
		expect(result!.data.version).toBe('1.2.3')
		expect(result!.data.license).toBe('MIT')
		expect(result!.data.requires_dist).toContain('requests>=2.25.0')
	})
})

describe('parse', () => {
	it('should parse basic fields', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.summary).toBe('A short description of the package')
		expect(result.description).toBe('A short description of the package')
		expect(result.home_page).toBe('https://example.com/example-package')
		expect(result.author).toBe('Jane Smith')
		expect(result.author_email).toBe('jane@example.com')
		expect(result.maintainer).toBe('Bob Jones')
		expect(result.maintainer_email).toBe('bob@example.com')
		expect(result.license).toBe('MIT')
		expect(result.requires_python).toBe('>=3.8')
		expect(result.metadata_version).toBe('2.1')
	})

	it('should parse keywords', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.keywords).toEqual(['example', 'test', 'metadata'])
	})

	it('should parse multi-value classifiers', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.classifiers).toContain('Development Status :: 5 - Production/Stable')
		expect(result.classifiers).toContain('Programming Language :: Python :: 3')
		expect(result.classifiers.length).toBe(5)
	})

	it('should parse multi-value Requires-Dist', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.requires_dist).toContain('requests>=2.25.0')
		expect(result.requires_dist).toContain('click>=7.0')
		expect(result.requires_dist).toContain('pyyaml')
	})

	it('should parse Project-URL with "Label, URL" format', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.project_urls.Repository).toBe('https://github.com/example/example-package')
		expect(result.project_urls['Bug Tracker']).toBe(
			'https://github.com/example/example-package/issues',
		)
		expect(result.project_urls.Documentation).toBe('https://example-package.readthedocs.io')
	})

	it('should extract long_description from body', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.long_description).toContain('Example Package')
		expect(result.long_description).toContain('longer description')
	})

	it('should skip UNKNOWN values', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'axel-events-axel/PKG-INFO'), 'utf8')
		const result = parse(content)

		expect(result.name).toBe('axel')
		expect(result.author).toBe('Adrian Cristea')
		expect(result.home_page).toBeUndefined()
	})

	it('should parse a real-world PKG-INFO (bflb-mcu-tool)', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, '9names-bflb-mcu-tool/PKG-INFO'),
			'utf8',
		)
		const result = parse(content)

		expect(result.name).toBe('bflb-mcu-tool')
		expect(result.version).toBe('1.8.6')
		expect(result.author).toBe('bouffalolab')
		expect(result.license).toBe('MIT')
		expect(result.requires_python).toBe('>=3.6')
		expect(result.classifiers.length).toBeGreaterThan(3)
	})
})
