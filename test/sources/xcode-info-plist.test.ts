import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { firstOf } from '../../src/lib/sources/source'
import { parse, xcodeInfoPlistSource } from '../../src/lib/sources/xcode-info-plist'

const fixturesDirectory = resolve('test/fixtures/xcode-info-plist')

describe('xcodeInfoPlist source', () => {
	it('should be available in a directory with Info.plist', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['Info.plist'],
			options: { path: resolve(fixturesDirectory, 'alexchantastic-alfred-lipsum-workflow') },
		}
		expect(await xcodeInfoPlistSource.extract(context)).toBeDefined()
	})

	it('should not be available in a directory without Info.plist', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: [],
			options: { path: '/tmp' },
		}
		expect(await xcodeInfoPlistSource.extract(context)).toBeUndefined()
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			metadata: {},
			fileTree: ['Info.plist'],
			options: { path: resolve(fixturesDirectory, 'alexchantastic-alfred-lipsum-workflow') },
		}
		const result = firstOf(await xcodeInfoPlistSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.data.name).toBe('Lorem Ipsum')
		expect(result!.data.author).toBe('Alex Chan')
		expect(result!.data.version).toBe('4.0.3')
		expect(result!.data.identifier).toBe('com.alexchantastic.loremipsum')
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

	it('should return undefined for invalid plist', () => {
		expect(parse('not a plist')).toBeUndefined()
	})

	it('should return undefined for non-dictionary root', () => {
		const arrayPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array><string>item</string></array>
</plist>`
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
