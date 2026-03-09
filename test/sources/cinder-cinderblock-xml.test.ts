import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import {
	cinderCinderblockXmlSource,
	parse as parseCinderCinderblock,
} from '../../src/lib/sources/cinder-cinderblock-xml'
import { firstOf } from '../../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/cinder-cinderblock-xml')

describe('cinderCinderblockXml source', () => {
	it('should be available in a directory with cinderblock.xml', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['cinderblock.xml'],
			options: { path: resolve(fixturesDirectory, 'astellato-cinder-syphon') },
		}
		expect(await cinderCinderblockXmlSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without cinderblock.xml', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: [],
			options: { path: '/tmp' },
		}
		expect(await cinderCinderblockXmlSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed cinderblock data', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['cinderblock.xml'],
			options: { path: resolve(fixturesDirectory, 'astellato-cinder-syphon') },
		}
		const result = firstOf(await cinderCinderblockXmlSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Syphon')
		expect(result!.data.author).toBe('Anthony Stellato')
		expect(result!.data.supports).toEqual(['macOS'])
		expect(result!.data.git).toBe('https://github.com/astellato/Cinder-Syphon.git')
		expect(result!.source).toContain('cinderblock.xml')
	})
})

describe('parse', () => {
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
		const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory, 'cinderblock.xml'),
				'utf8',
			)
			expect(() => parseCinderCinderblock(content)).not.toThrow()
		}
	})
})
