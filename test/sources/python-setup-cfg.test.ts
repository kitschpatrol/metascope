import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import {
	parse as parseSetupCfg,
	pythonSetupCfgSource,
} from '../../src/lib/sources/python-setup-cfg'
import { firstOf } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/python-setup-cfg')

describe('pythonSetupCfg source', () => {
	it('should be available in a directory with a setup.cfg file', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['setup.cfg'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		expect(await pythonSetupCfgSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without setup.cfg', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: [],
			options: { path: '/tmp' },
		}
		expect(await pythonSetupCfgSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed metadata from a fixture', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['setup.cfg'],
			options: { path: resolve(fixturesDirectory, 'basic') },
		}
		const result = firstOf(await pythonSetupCfgSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.source).toBe('setup.cfg')
		expect(result!.data.name).toBe('example-package')
		expect(result!.data.version).toBe('1.2.3')
		expect(result!.data.license).toBe('MIT')
		expect(result!.data.install_requires).toContain('requests>=2.25.0')
	})
})

describe('parse', () => {
	it('should parse basic fields', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

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
	})

	it('should parse keywords as comma-separated list', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.keywords).toEqual(['example', 'test', 'metadata'])
	})

	it('should parse multi-line classifiers', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.classifiers).toContain('Development Status :: 5 - Production/Stable')
		expect(result.classifiers).toContain('Programming Language :: Python :: 3')
		expect(result.classifiers).toContain('License :: OSI Approved :: MIT License')
		expect(result.classifiers.length).toBe(6)
	})

	it('should parse install_requires from [options]', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.install_requires).toContain('requests>=2.25.0')
		expect(result.install_requires).toContain('click>=7.0')
		expect(result.install_requires).toContain('pyyaml')
		expect(result.python_requires).toBe('>=3.8')
	})

	it('should parse extras_require from [options.extras_require]', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.extras_require.dev).toContain('pytest>=6.0')
		expect(result.extras_require.dev).toContain('black')
		expect(result.extras_require.docs).toContain('sphinx')
	})

	it('should parse project_urls', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'with-urls/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.project_urls.Homepage).toBe('https://urltest.dev')
		expect(result.project_urls.Repository).toBe('https://github.com/alice/urltest')
		expect(result.project_urls['Bug Tracker']).toBe('https://github.com/alice/urltest/issues')
		expect(result.project_urls.Documentation).toBe('https://urltest.readthedocs.io')
	})

	it('should parse minimal setup.cfg', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'minimal/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.name).toBe('minimal-pkg')
		expect(result.version).toBe('0.1.0')
		expect(result.description).toBe('Minimal setup.cfg')
		expect(result.author).toBeUndefined()
	})

	it('should parse a real-world setup.cfg (gazu)', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'cgwire-gazu/setup.cfg'), 'utf8')
		const result = parseSetupCfg(content)

		expect(result.name).toBe('gazu')
		expect(result.author).toBe('CG Wire')
		expect(result.author_email).toBe('frank@cg-wire.com')
		expect(result.url).toBe('https://gazu.cg-wire.com/')
		expect(result.install_requires).toContain('requests>=2.25.1')
		expect(result.classifiers.length).toBeGreaterThan(5)
		expect(result.extras_require.dev).toContain('wheel')
		expect(result.extras_require.test).toContain('pytest')
	})
})
