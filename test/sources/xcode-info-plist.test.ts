import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import { parse, xcodeInfoPlistSource } from '../../src/lib/sources/xcode-info-plist'

const fixturesDirectory = resolve('test/fixtures/xcode-info-plist')
const discoveryFixturesDirectory = resolve('test/fixtures/xcode-info-plist-discovery')

// Fixture repository names and contents: cspell:ignore Blacktree PIVX qsplugin qswindowinterfaceplugin stonecoin stonecoinproject

describe('xcodeInfoPlist source', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should be available in a directory with Info.plist', async () => {
		expect(
			await xcodeInfoPlistSource.discover({
				options: { path: resolve(fixturesDirectory, 'alexchantastic-alfred-lipsum-workflow') },
			}),
		).not.toHaveLength(0)
	})

	it('should not be available in a directory without Info.plist', async () => {
		expect(
			await xcodeInfoPlistSource.discover({ options: { path: resolve('test/fixtures/_empty') } }),
		).toHaveLength(0)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const result = await xcodeInfoPlistSource.parse('Info.plist', {
			options: { path: resolve(fixturesDirectory, 'alexchantastic-alfred-lipsum-workflow') },
		})

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Lorem Ipsum')
		expect(result!.data.author).toBe('Alex Chan')
		expect(result!.data.version).toBe('4.0.3')
		expect(result!.data.identifier).toBe('com.alexchantastic.loremipsum')
	})

	it('should discover a target-prefixed Info.plist one directory down', async () => {
		const path = resolve(discoveryFixturesDirectory, 'kitschpatrol-math-reduce')
		expect(await xcodeInfoPlistSource.discover({ options: { path } })).toEqual([
			resolve(path, 'MathReduce/MathReduce-Info.plist'),
		])
	})

	it('should discover deeper Info.plist files only when recursive', async () => {
		const path = resolve(discoveryFixturesDirectory, 'kitschpatrol-math-reduce')
		expect(await xcodeInfoPlistSource.discover({ options: { path, recursive: true } })).toEqual([
			resolve(path, 'MathReduce/MathReduce-Info.plist'),
			resolve(path, 'scrapbook/Math Reduce.workflow/Contents/Info.plist'),
		])
	})

	it('should discover a prefixed Info.plist at the root', async () => {
		const path = resolve(discoveryFixturesDirectory, 'kitschpatrol-augment-video')
		expect(await xcodeInfoPlistSource.discover({ options: { path } })).toEqual([
			resolve(path, 'openFrameworks-Info.plist'),
		])
	})

	it('should skip Firebase GoogleService-Info.plist files', async () => {
		const path = resolve(discoveryFixturesDirectory, 'firebase-ios-app')
		expect(await xcodeInfoPlistSource.discover({ options: { path } })).toEqual([
			resolve(path, 'App/Info.plist'),
		])
	})

	it('should extract metadata from a target-prefixed Info.plist', async () => {
		const result = await xcodeInfoPlistSource.parse('MathReduce/MathReduce-Info.plist', {
			options: { path: resolve(discoveryFixturesDirectory, 'kitschpatrol-math-reduce') },
		})

		expect(result).toBeDefined()
		expect(result!.data.version).toBe('1.0')
		expect(result!.data.copyrightHolder).toBe('Eric Mika')
		expect(result!.data.copyrightYear).toBe('2013')
	})
})

describe('parse', () => {
	it('should parse an Alfred workflow plist', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'alexchantastic-alfred-lipsum-workflow/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.name).toBe('Lorem Ipsum')
		expect(result!.author).toBe('Alex Chan')
		expect(result!.description).toBe('Generate dummy lorem ipsum text.')
		expect(result!.version).toBe('4.0.3')
		expect(result!.identifier).toBe('com.alexchantastic.loremipsum')
		expect(result!.url).toBe('https://github.com/alexchantastic/alfred-lipsum-workflow')
	})

	it('should parse an Apple app bundle with iOS detection', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'brettalcox-logu-swift/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.identifier).toBe('com.iftekhar.IQKeyboardManager')
		expect(result!.version).toBe('4.0')
		expect(result!.operatingSystems).toContain('iOS')
		expect(result!.processorRequirements).toContain('armv7')
	})

	it('should filter out Xcode build variables', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'brettalcox-logu-swift/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		// CFBundleDisplayName is "${PRODUCT_NAME}" which should be filtered
		// Name should fall through to CFBundleName, also "${PRODUCT_NAME}", also filtered
		expect(result!.name).toBeUndefined()
	})

	it('should drop template placeholder bundle identifiers', async () => {
		const content = await readFile(
			resolve(discoveryFixturesDirectory, 'kitschpatrol-augment-video/openFrameworks-Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.identifier).toBeUndefined()
		expect(result!.version).toBe('1.0')
	})

	it('should parse copyright information', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, '360controller-360controller/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.copyrightYear).toBe('2013')
		expect(result!.copyrightHolder).toBe('MICE Software')
	})

	it('should parse copyright year ranges', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'stonecoinproject-stonecoin/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.copyrightYear).toBe('2009')
		expect(result!.copyrightHolder).toBe(
			'The Bitcoin Core developers, 2014-2017 The Dash and PIVX Core Developers, 2018-2019 The Stone Core developers',
		)
	})

	it('should strip a comma between the copyright year and holder', async () => {
		const content = await readFile(
			resolve(fixturesDirectory, 'quicksilver-qswindowinterfaceplugin-qsplugin/Info.plist'),
			'utf8',
		)
		const result = parse(content)

		expect(result).toBeDefined()
		expect(result!.copyrightYear).toBe('2004')
		expect(result!.copyrightHolder).toBe('Blacktree, Inc')
	})

	it('should return undefined for invalid plist', () => {
		expect(parse('not a plist')).toBeUndefined()
	})

	it('should return undefined for non-dictionary root', () => {
		/* eslint-disable unicorn/prefer-https -- Canonical Apple DTD identifier is http */
		const arrayPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array><string>item</string></array>
</plist>`
		/* eslint-enable unicorn/prefer-https */
		expect(parse(arrayPlist)).toBeUndefined()
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		for (const directory of directories) {
			const content = await readFile(
				resolve(fixturesDirectory, directory.name, 'Info.plist'),
				'utf8',
			)
			const result = parse(content)
			expect(result, `fixture "${directory.name}" should parse`).toBeDefined()
		}
	})
})
