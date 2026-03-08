import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGoreleaser } from '../../src/lib/parsers/goreleaser-parser'

const fixturesDirectory = resolve('test/fixtures/goreleaser')

describe('parseGoreleaser', () => {
	it('should parse project_name', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'aenthill-aenthill/.goreleaser.yml'),
			'utf8',
		)
		const result = parseGoreleaser(content)

		expect(result).toBeDefined()
		expect(result!.project_name).toBe('Aenthill')
	})

	it('should parse description and homepage from brew/scoop sections (v1 singular)', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'aenthill-aenthill/.goreleaser.yml'),
			'utf8',
		)
		const result = parseGoreleaser(content)

		expect(result).toBeDefined()
		expect(result!.description).toContain('bootstrapping your Docker projects')
		expect(result!.homepage).toBe('https://aenthill.github.io/')
		expect(result!.license).toBe('MIT')
	})

	it('should extract operating systems from builds[].goos', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'aenthill-aenthill/.goreleaser.yml'),
			'utf8',
		)
		const result = parseGoreleaser(content)

		expect(result).toBeDefined()
		expect(result!.operating_systems).toContain('Linux')
		expect(result!.operating_systems).toContain('macOS')
		expect(result!.operating_systems).toContain('Windows')
	})

	it('should extract goos from builds with only goos (no metadata sections)', () => {
		const content = readFileSync(resolve(fixturesDirectory, '0p5dev-ops/.goreleaser.yaml'), 'utf8')
		const result = parseGoreleaser(content)

		expect(result).toBeDefined()
		expect(result!.operating_systems).toContain('Linux')
		expect(result!.operating_systems).toContain('Windows')
		expect(result!.operating_systems).toContain('macOS')
	})

	it('should return undefined for non-object YAML', () => {
		expect(parseGoreleaser('just a string')).toBeUndefined()
	})

	it('should parse all fixtures without returning undefined', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const goreleaserFile = files.find(
				(name) => name === '.goreleaser.yaml' || name === '.goreleaser.yml',
			)
			if (!goreleaserFile) continue

			const content = readFileSync(resolve(directoryPath, goreleaserFile), 'utf8')
			const result = parseGoreleaser(content)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(339)
	})
})
