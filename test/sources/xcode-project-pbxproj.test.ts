import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { parse, xcodeProjectPbxprojSource } from '../../src/lib/sources/xcode-project-pbxproj'

const fixturesDirectory = resolve('test/fixtures/xcode-project-pbxproj')

describe('xcodeProjectPbxproj source', () => {
	it('should be available in a directory with a .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'c2p-cmd-jokeapi'),
		}
		expect(await xcodeProjectPbxprojSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without .xcodeproj', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await xcodeProjectPbxprojSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'c2p-cmd-jokeapi'),
		}
		const result = await xcodeProjectPbxprojSource.extract(context)

		expect(result.version).toBe('0.1')
		expect(result.identifier).toBe('com.kidastudios.aioEntertainment')
		expect(result.programmingLanguage).toBe('Swift')
	})
})

describe('parse', () => {
	it('should parse build settings from a tvOS app', () => {
		const result = parse(
			resolve(fixturesDirectory, 'c2p-cmd-jokeapi/c2p-cmd-jokeapi.xcodeproj/project.pbxproj'),
		)

		expect(result).toBeDefined()
		expect(result!.version).toBe('0.1')
		expect(result!.identifier).toBe('com.kidastudios.aioEntertainment')
		expect(result!.programmingLanguage).toBe('Swift')
		expect(result!.operatingSystems.some((os) => os.includes('tvOS'))).toBe(true)
	})

	it('should extract organization name', () => {
		const result = parse(
			resolve(
				fixturesDirectory,
				'enescakir-leyladan-sonra-ios/enescakir-leyladan-sonra-ios.xcodeproj/project.pbxproj',
			),
		)

		expect(result).toBeDefined()
		expect(result!.organizationName).toBe('EnesCakir')
	})

	it('should extract SDKROOT-based OS when no deployment target is set', () => {
		const result = parse(
			resolve(fixturesDirectory, 'fyralabs-moonshot/fyralabs-moonshot.xcodeproj/project.pbxproj'),
		)

		expect(result).toBeDefined()
		expect(result!.operatingSystems.length).toBeGreaterThan(0)
	})

	it('should return undefined for invalid file path', () => {
		expect(parse('/nonexistent/project.pbxproj')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const xcodeDirectory = await readdir(resolve(fixturesDirectory, directory.name))
			const xcodeprojDirectory = xcodeDirectory.find((name) => name.endsWith('.xcodeproj'))
			if (!xcodeprojDirectory) continue

			const filePath = resolve(
				fixturesDirectory,
				directory.name,
				xcodeprojDirectory,
				'project.pbxproj',
			)
			const result = parse(filePath)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
		}
	})
})
