import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseReadme, readmePattern } from '../../src/lib/parsers/readme-parser'

const fixturesDirectory = resolve('test/fixtures/readme')

describe('parseReadme', () => {
	it('should extract an H1 heading', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'modallmedia-hyperspeed-sdk/README.md'),
			'utf8',
		)
		const result = parseReadme(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Hyperspeed SDK V1.0.0')
	})

	it('should extract a plain H1 heading', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, '74th-qmk-firmware-sparrow-keyboard/README.md'),
			'utf8',
		)
		const result = parseReadme(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('sparrow60c')
	})

	it('should extract H1 with non-ASCII characters', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'fisco-bcos-hackathon/README.md'),
			'utf8',
		)
		const result = parseReadme(content)

		expect(result).toBeDefined()
		expect(result!.name).toContain('合约接口说明文档')
	})

	it('should return undefined when there is no H1', () => {
		const content = readFileSync(resolve(fixturesDirectory, 'next-hat-nanocl/README.md'), 'utf8')
		const result = parseReadme(content)

		expect(result).toBeUndefined()
	})

	it('should return undefined for empty content', () => {
		expect(parseReadme('')).toBeUndefined()
	})

	it('should extract from first H1 only when multiple exist', () => {
		const content = readFileSync(
			resolve(fixturesDirectory, 'sebastiendamaye-tryhackme/README.md'),
			'utf8',
		)
		const result = parseReadme(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Brooklyn Nine Nine')
	})

	it('should parse fixtures that have H1 headings', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory())

		expect(dirs.length).toBe(19)

		let withH1 = 0
		for (const dir of dirs) {
			const content = readFileSync(resolve(fixturesDirectory, dir.name, 'README.md'), 'utf8')
			const result = parseReadme(content)
			if (result) withH1++
		}

		// At least some fixtures should have H1 headings
		expect(withH1).toBeGreaterThan(5)
	})
})

describe('readmePattern', () => {
	it('should match README.md', () => {
		expect(readmePattern.test('README.md')).toBe(true)
	})

	it('should match readme.md', () => {
		expect(readmePattern.test('readme.md')).toBe(true)
	})

	it('should match README', () => {
		expect(readmePattern.test('README')).toBe(true)
	})

	it('should match README.txt', () => {
		expect(readmePattern.test('README.txt')).toBe(true)
	})

	it('should match Readme.rst', () => {
		expect(readmePattern.test('Readme.rst')).toBe(true)
	})

	it('should not match READMETOO', () => {
		expect(readmePattern.test('READMETOO')).toBe(false)
	})

	it('should not match package.json', () => {
		expect(readmePattern.test('package.json')).toBe(false)
	})
})
