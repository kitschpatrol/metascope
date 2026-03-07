import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePbxproj } from '../../src/lib/parsers/pbxproj-parser'

const fixturesDir = resolve('test/fixtures/pbxproj')

describe('parsePbxproj', () => {
	it('should parse build settings from a tvOS app', () => {
		const result = parsePbxproj(
			resolve(fixturesDir, 'c2p-cmd-jokeapi/c2p-cmd-jokeapi.xcodeproj/project.pbxproj'),
		)

		expect(result).toBeDefined()
		expect(result!.version).toBe('0.1')
		expect(result!.identifier).toBe('com.kidastudios.aioEntertainment')
		expect(result!.programmingLanguage).toBe('Swift')
		expect(result!.operatingSystems.some((os) => os.includes('tvOS'))).toBe(true)
	})

	it('should extract organization name', () => {
		const result = parsePbxproj(
			resolve(
				fixturesDir,
				'enescakir-leyladan-sonra-ios/enescakir-leyladan-sonra-ios.xcodeproj/project.pbxproj',
			),
		)

		expect(result).toBeDefined()
		expect(result!.organizationName).toBe('EnesCakir')
	})

	it('should extract SDKROOT-based OS when no deployment target is set', () => {
		const result = parsePbxproj(
			resolve(fixturesDir, 'fyralabs-moonshot/fyralabs-moonshot.xcodeproj/project.pbxproj'),
		)

		expect(result).toBeDefined()
		expect(result!.operatingSystems.length).toBeGreaterThan(0)
	})

	it('should return undefined for invalid file path', () => {
		expect(parsePbxproj('/nonexistent/project.pbxproj')).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDir, { withFileTypes: true })
		const dirs = entries.filter((entry) => entry.isDirectory())

		expect(dirs.length).toBeGreaterThan(0)

		for (const dir of dirs) {
			const xcodeDir = await readdir(resolve(fixturesDir, dir.name))
			const xcodeprojDir = xcodeDir.find((name) => name.endsWith('.xcodeproj'))
			if (!xcodeprojDir) continue

			const filePath = resolve(fixturesDir, dir.name, xcodeprojDir, 'project.pbxproj')
			const result = parsePbxproj(filePath)
			expect(result, `fixture "${dir.name}" should parse`).toBeDefined()
		}
	})
})
