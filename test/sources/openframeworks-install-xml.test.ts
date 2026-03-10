import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import {
	openframeworksInstallXmlSource,
	parse,
} from '../../src/lib/sources/openframeworks-install-xml'

const fixturesDirectory = resolve('test/fixtures/openframeworks-install-xml')

describe('openframeworksInstallXml source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with install.xml', async () => {
		expect(
			await openframeworksInstallXmlSource.getInputs({
				options: { path: resolve(fixturesDirectory, 'elliotwoods-ofxgraycode') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without install.xml', async () => {
		expect(
			await openframeworksInstallXmlSource.getInputs({
				options: { path: resolve('test/fixtures/_empty') },
			}),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const result = await openframeworksInstallXmlSource.parseInput('install.xml', {
			options: { path: resolve(fixturesDirectory, 'elliotwoods-ofxgraycode') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('ofxGraycode')
		expect(result!.data.version).toBe('0.01')
		expect(result!.data.author).toBe('Elliot Woods')
		expect(result!.source).toContain('install.xml')
	})
})

describe('parse', () => {
	it('should parse a basic install.xml with name, version, and author', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'elliotwoods-ofxgraycode/install.xml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('ofxGraycode')
		expect(result!.version).toBe('0.01')
		expect(result!.author).toBe('Elliot Woods')
		expect(result!.url).toBe('http://github.com/elliotwoods/ofxGraycode')
	})

	it('should parse code_url, site_url, download_url, and description', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'armadillu-ofxscenemanager/install.xml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('ofxSceneManager')
		expect(result!.codeUrl).toBe('https://github.com/armadillu/ofxSceneManager')
		expect(result!.siteUrl).toBe('http://www.uri.cat')
		expect(result!.description).toContain('ofxSceneManager helps handle different scenes')
	})

	it('should extract operating systems from lib os attributes', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'nuigroup-ccv-tbeta/install.xml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.operatingSystems).toContain('Windows')
		expect(result!.operatingSystems).toContain('macOS')
		expect(result!.operatingSystems).toContain('Linux')
	})

	it('should handle malformed CDATA', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'armadillu-ofxscenemanager/install.xml'),
			'utf8',
		)
		// This fixture uses <[CDATA[...]]> instead of <![CDATA[...]]>
		expect(content).toContain('<[CDATA[')
		const result = parse(content)
		expect(result).toBeDefined()
		expect(result!.author).toBeDefined()
	})

	it('should return undefined for non-openFrameworks XML', () => {
		const content = '<root><item>no addons here</item></root>'
		expect(parse(content)).toBeUndefined()
	})

	it('should return undefined for invalid XML', () => {
		expect(parse('not xml <{')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory.name, 'install.xml'),
				'utf8',
			)
			const result = parse(content)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
		}
	})
})
