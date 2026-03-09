import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { parse, publiccodeYamlSource } from '../../src/lib/sources/publiccode-yaml'

const fixturesDirectory = resolve('test/fixtures/publiccode-yaml')

describe('publiccodeYaml source', () => {
	it('should be available in a directory with publiccode.yml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'cisofy-lynis'),
		}
		expect(await publiccodeYamlSource.isAvailable(context)).toBe(true)
	})

	it('should be available in a directory with publiccode.yaml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'commongateway-corebundle'),
		}
		expect(await publiccodeYamlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without publiccode files', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await publiccodeYamlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a .yml fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'cisofy-lynis'),
		}
		const result = await publiccodeYamlSource.extract(context)

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Lynis')
		expect(result!.data.license).toBe('AGPL-3.0-only')
		expect(result!.data.platforms).toContain('linux')
		expect(result!.source).toContain('publiccode.yml')
	})

	it('should extract parsed metadata from a .yaml fixture', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'commongateway-corebundle'),
		}
		const result = await publiccodeYamlSource.extract(context)

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('CoreBundle')
		expect(result!.data.license).toBe('EUPL-1.2-or-later')
		expect(result!.data.dependencies.length).toBe(1)
		expect(result!.source).toContain('publiccode.yaml')
	})
})

describe('parse', () => {
	it('should parse basic fields from cisofy-lynis', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'cisofy-lynis/publiccode.yml'), 'utf8')
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Lynis')
		expect(result!.url).toBe('https://github.com/CISOfy/lynis')
		expect(result!.publiccodeYmlVersion).toBe('0.4')
		expect(result!.releaseDate).toBe('2025-01-28')
		expect(result!.developmentStatus).toBe('stable')
		expect(result!.softwareType).toBe('standalone/other')
		expect(result!.platforms).toEqual(['linux', 'mac'])
		expect(result!.categories).toContain('it-security')
		expect(result!.license).toBe('AGPL-3.0-only')
		expect(result!.maintenanceType).toBe('community')
	})

	it('should parse English description with features', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'cisofy-lynis/publiccode.yml'), 'utf8')
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.description).toBeDefined()
		expect(result!.description!.shortDescription).toContain('Security auditing tool')
		expect(result!.description!.longDescription).toContain('security auditing tool')
		expect(result!.description!.documentation).toBe('https://cisofy.com/documentation/lynis/')
		expect(result!.description!.features).toContain('command-line')
		expect(result!.description!.features.length).toBe(5)
	})

	it('should parse multi-language descriptions', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.descriptions).toHaveProperty('en')
		expect(result!.descriptions).toHaveProperty('nl')
		expect(result!.descriptions.en.localisedName).toBe('Appsemble')
		expect(result!.descriptions.nl.localisedName).toBe('Appsemble')
		// Preferred description should be English
		expect(result!.description).toStrictEqual(result!.descriptions.en)
	})

	it('should parse contacts and maintenance', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'cisofy-lynis/publiccode.yml'), 'utf8')
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.contacts.length).toBe(1)
		expect(result!.contacts[0].name).toBe('Michael Boelen')
		expect(result!.contacts[0].email).toBe('michael.boelen@cisofy.com')
	})

	it('should parse contacts with affiliation', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'commongateway-corebundle/publiccode.yaml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.contacts.length).toBe(1)
		expect(result!.contacts[0].name).toBe('Ruben van der Linde')
		expect(result!.contacts[0].affiliation).toBe('Conduction')
	})

	it('should parse contractors', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'commongateway-corebundle/publiccode.yaml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.contractors.length).toBe(1)
		expect(result!.contractors[0].name).toBe('Conduction')
		expect(result!.contractors[0].until).toBe('2035-01-01')
		expect(result!.contractors[0].website).toBe('https://www.conduction.nl')
	})

	it('should parse dependencies with version constraints', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'commongateway-corebundle/publiccode.yaml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.dependencies.length).toBe(1)
		expect(result!.dependencies[0]).toEqual({
			category: 'open',
			name: 'CommonGateway',
			optional: false,
			version: '1.2.47',
			versionMax: '1.3',
			versionMin: '1.2',
		})
	})

	it('should parse dependencies from appsemble', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.dependencies.length).toBe(4)
		expect(result!.dependencies[0]).toEqual({ category: 'open', name: 'Docker' })
		expect(result!.dependencies[2]).toEqual({
			category: 'open',
			name: 'NodeJS',
			versionMin: '20',
		})
	})

	it('should parse inputTypes and outputTypes', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'commongateway-corebundle/publiccode.yaml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.inputTypes).toContain('application/json')
		expect(result!.inputTypes).toContain('application/xml')
		expect(result!.outputTypes).toContain('application/json+ld')
	})

	it('should parse usedBy', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.usedBy).toContain('Gemeente Amsterdam')
		expect(result!.usedBy).toContain('Gemeente Amersfoort')
	})

	it('should parse legal section with all fields', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.license).toBe('LGPL-3.0-only')
		expect(result!.mainCopyrightOwner).toBe('Appsemble')
		expect(result!.repoOwner).toBe('Appsemble')
	})

	it('should parse localisation section', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.localisationReady).toBe(true)
		expect(result!.availableLanguages).toContain('en')
		expect(result!.availableLanguages).toContain('nl')
		expect(result!.availableLanguages.length).toBe(9)
	})

	it('should parse logo and monochromeLogo', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'appsemble-appsemble/publiccode.yml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.logo).toBe('config/assets/logo.svg')
		expect(result!.monochromeLogo).toBe('config/assets/logo-monochrome.svg')
	})

	it('should parse landingURL', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'commongateway-corebundle/publiccode.yaml'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.landingUrl).toBe('https://commongateway.github.io/CoreBundle')
	})

	it('should return undefined for invalid YAML', () => {
		expect(parse(':::not yaml:::')).toBeUndefined()
	})

	it('should return undefined for non-object YAML', () => {
		expect(parse('just a string')).toBeUndefined()
	})

	it('should return undefined for object without name or url', () => {
		expect(parse('foo: bar\nbaz: 42')).toBeUndefined()
	})

	it('should parse all fixtures without returning undefined', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const publiccodeFile = files.find(
				(name) => name === 'publiccode.yml' || name === 'publiccode.yaml',
			)
			if (!publiccodeFile) continue

			const content = readFileSync(resolve(directoryPath, publiccodeFile), 'utf8')
			const result = parse(content)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(324)
	})
})
