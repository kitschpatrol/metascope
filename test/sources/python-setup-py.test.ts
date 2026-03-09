import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { parse, pythonSetupPySource } from '../../src/lib/sources/python-setup-py'
import { resetMatchCache } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/python-setup-py')

describe('python-setup-py source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with a setup.py file', async () => {
		expect(await pythonSetupPySource.getInputs({
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'basic') },
		})).not.toHaveLength(0)
	})

	it('should not be available in a directory without setup.py', async () => {
		expect(await pythonSetupPySource.getInputs({
			metadata: {},
			options: { path: resolve('test/fixtures/_empty') },
		})).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture', async () => {
		const result = await pythonSetupPySource.parseInput('setup.py', {
			metadata: {},
			options: { path: resolve(fixturesDirectory, 'basic') },
		})

		expect(result).toBeDefined()
		expect(result!.source).toBe('setup.py')
		expect(result!.data.name).toBe('example-package')
		expect(result!.data.version).toBe('1.2.3')
		expect(result!.data.license).toBe('MIT')
		expect(result!.data.install_requires).toContain('requests>=2.25.0')
	})
})

describe('parse', () => {
	it('should parse basic fields', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.description).toBe('A short description of the package')
		expect(result.author).toBe('Jane Smith')
		expect(result.author_email).toBe('jane@example.com')
		expect(result.maintainer).toBe('Bob Jones')
		expect(result.maintainer_email).toBe('bob@example.com')
		expect(result.url).toBe('https://example.com/example-package')
		expect(result.download_url).toBe('https://example.com/example-package/releases')
		expect(result.license).toBe('MIT')
		expect(result.python_requires).toBe('>=3.8')
	})

	it('should parse keywords list', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.keywords).toEqual(['example', 'test', 'metadata'])
	})

	it('should parse classifiers', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.classifiers).toContain('Development Status :: 5 - Production/Stable')
		expect(result.classifiers).toContain('Programming Language :: Python :: 3')
		expect(result.classifiers.length).toBe(5)
	})

	it('should parse install_requires', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.install_requires).toContain('requests>=2.25.0')
		expect(result.install_requires).toContain('click>=7.0')
		expect(result.install_requires).toContain('pyyaml')
	})

	it('should parse extras_require', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.extras_require.dev).toContain('pytest>=6.0')
		expect(result.extras_require.docs).toContain('sphinx')
	})

	it('should parse project_urls', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.project_urls.Repository).toBe('https://github.com/example/example-package')
		expect(result.project_urls['Bug Tracker']).toBe(
			'https://github.com/example/example-package/issues',
		)
	})

	it('should parse minimal setup.py', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'minimal/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.name).toBe('minimal-pkg')
		expect(result.version).toBe('0.1.0')
		expect(result.description).toBe('Minimal setup.py')
		expect(result.author).toBeUndefined()
	})

	it('should skip variable references (non-literal values)', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'with-variables/setup.py'), 'utf8')
		const result = await parse(content)

		expect(result.name).toBe('dynamic-pkg')
		// VERSION and AUTHOR are variable references, not string literals
		expect(result.version).toBeUndefined()
		expect(result.author).toBeUndefined()
		// But string literals are still extracted
		expect(result.description).toBe('Package with variables')
		expect(result.author_email).toBe('dynamic@example.com')
		expect(result.license).toBe('BSD-3-Clause')
	})

	it('should parse a real-world setup.py (colorlog)', async () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'borntyping-python-colorlog/setup.py'),
			'utf8',
		)
		const result = await parse(content)

		expect(result.name).toBe('colorlog')
		expect(result.version).toBe('6.10.1')
		expect(result.author).toBe('Sam Clements')
		expect(result.author_email).toBe('sam@borntyping.co.uk')
		expect(result.license).toBe('MIT License')
		expect(result.classifiers.length).toBeGreaterThan(5)
	})
})
