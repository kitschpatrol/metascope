import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCinderCinderblock } from '../../src/lib/parsers/cinder-cinderblock-parser'

const fixturesDirectory = resolve('test/fixtures/cinder-cinderblock')

describe('parseCinderCinderblock', () => {
	it('should parse a cinderblock with full metadata', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'astellato-cinder-syphon/cinderblock.xml'),
			'utf8',
		)
		const result = parseCinderCinderblock(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Syphon')
		expect(result!.id).toBe('info.v002.syphon')
		expect(result!.author).toBe('Anthony Stellato')
		expect(result!.summary).toBe('An implementation of the Syphon framework for Cinder')
		expect(result!.version).toBe('Public Beta 2')
		expect(result!.git).toBe('https://github.com/astellato/Cinder-Syphon.git')
		expect(result!.url).toBe('https://github.com/astellato/Cinder-Syphon')
		expect(result!.library).toBe('http://syphon.v002.info')
		expect(result!.supports).toEqual(['macOS'])
		expect(result!.requires).toEqual([])
	})

	it('should parse a cinderblock with multiple OS support', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'danieldormann-cinder-qrcodegenerator/cinderblock.xml'),
			'utf8',
		)
		const result = parseCinderCinderblock(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Cinder-QRCodeGenerator')
		expect(result!.author).toBe('Daniel Dormann')
		expect(result!.supports).toContain('Windows')
		expect(result!.supports).toContain('macOS')
	})

	it('should return undefined for invalid XML', () => {
		expect(parseCinderCinderblock('not xml at all {')).toBeUndefined()
	})

	it('should return undefined for XML without cinder root', () => {
		expect(parseCinderCinderblock('<root><child /></root>')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(dirs.length).toBeGreaterThan(0)

		for (const dir of dirs) {
			const content = await readFile(resolve(fixturesDirectory, dir, 'cinderblock.xml'), 'utf8')
			expect(() => parseCinderCinderblock(content)).not.toThrow()
		}
	})
})
