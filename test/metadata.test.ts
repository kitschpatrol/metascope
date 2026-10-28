import { describe, expect, it } from 'vitest'
import type { MetadataContext } from '../src/lib/metadata-types'
import { getMetadata, sourceNames } from '../src/lib/metadata'
import { defineTemplate } from '../src/lib/metadata-types'
import { templates } from '../src/lib/templates'
import { firstOf } from '../src/lib/utilities/template-helpers'

// Fixture repository names: cspell:ignore aisaac andrenth astewart ccfcheng colinduquesnoy dakomura flink histo managesieve misson nakagami ofxquick qdarkstylesheet reportlab thomasgeissl

const nonEmptyBranch = /\S/v

// @case-police-ignore github

describe('getMetadata', { timeout: 30_000 }, () => {
	it('should return metadata with nodePackageJson and git sources', async () => {
		const result = await getMetadata({ path: '.' })

		// Should have package.json data
		expect(result.nodePackageJson).toBeDefined()
		expect(firstOf(result.nodePackageJson)!.data.name).toBe('metascope')

		// Should have git statistics data
		expect(result.gitStats).toBeDefined()
		expect(firstOf(result.gitStats)!.data.branchCurrent).toMatch(nonEmptyBranch)
	})

	it('should not contain undefined values in output', async () => {
		const result = await getMetadata({ path: '.' })
		const json = JSON.stringify(result)
		// JSON.stringify drops undefined, so parsing should roundtrip cleanly
		expect(JSON.parse(json)).toEqual(result)
	})

	it('should not include empty source objects', async () => {
		const result = await getMetadata({ path: '.' })
		// Sources that aren't available should not appear as empty objects
		// (arrays like licenseFile may legitimately be empty)
		const emptyObjectKeys: string[] = []
		for (const [key, value] of Object.entries(result)) {
			if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
				emptyObjectKeys.push(key)
			}
		}

		expect(emptyObjectKeys).toEqual([])
	})

	it('should apply a template function', async () => {
		const template = defineTemplate(({ gitStats, nodePackageJson }) => ({
			branch: firstOf(gitStats)?.data.branchCurrent,
			name: firstOf(nodePackageJson)?.data.name,
		}))

		const result = await getMetadata({ path: '.', template })
		expect(result.branch).toMatch(nonEmptyBranch)
		expect(result).toEqual({
			branch: result.branch,
			name: 'metascope',
		})
	})

	it('should strip undefined from template output', async () => {
		const template = defineTemplate(({ obsidianPluginRegistry }) => ({
			downloads: firstOf(obsidianPluginRegistry)?.data.downloadCount,
		}))

		const result = await getMetadata({ path: '.', template })
		// The obsidianPluginRegistry source is not available, so downloadCount is undefined
		// stripUndefined should remove it, resulting in empty object (which is also stripped)
		expect(result).not.toHaveProperty('downloads')
	})

	it('should resolve path to absolute', async () => {
		// Passing relative path should work
		const result = await getMetadata({ path: '.' })
		expect(result.nodePackageJson).toBeDefined()
	})

	it('should handle built-in template name', async () => {
		const result = await getMetadata({ path: '.', template: 'frontmatter' })
		// Built-in template should return a shaped object
		expect(result).toHaveProperty('Name')
	})

	it('should pass templateData through to template function', async () => {
		const template = defineTemplate((_context, templateData) => ({
			account: templateData.githubAccount,
			author: templateData.authorName,
		}))

		const result = await getMetadata({
			path: '.',
			template,
			templateData: { authorName: 'Test Author', githubAccount: 'testAccount' },
		})
		expect(result).toEqual({ account: 'testAccount', author: 'Test Author' })
	})

	it('should default templateData to empty object when not provided', async () => {
		const template = defineTemplate((_context, templateData) => ({
			hasData: Object.keys(templateData).length > 0,
		}))

		const result = await getMetadata({ path: '.', template })
		expect(result).toEqual({ hasData: false })
	})

	it('should only run specified sources when sources option is provided', async () => {
		const result = await getMetadata({
			path: 'test/fixtures/all-sources',
			sources: ['nodePackageJson', 'licenseFile'],
		})

		// Requested sources should be present
		expect(result.nodePackageJson).toBeDefined()
		expect(result.licenseFile).toBeDefined()

		// Other sources that would match files in all-sources should be absent
		expect(result.rustCargoToml).toBeUndefined()
		expect(result.codemetaJson).toBeUndefined()
		expect(result.pythonPyprojectToml).toBeUndefined()
	})

	it('should preserve licenseFile record shape when no SPDX template matches', async () => {
		const result = await getMetadata({
			absolute: false,
			path: 'test/fixtures/license-file/_proprietary',
			sources: ['licenseFile'],
		})

		// A license file present on disk but not SPDX-identifiable (e.g. a
		// proprietary "All Rights Reserved" notice) records `type: 'unknown'`.
		// Consumers read `record.data.match?.<field>` for SPDX-derived data and
		// can branch on `record.data.type` to detect proprietary projects.
		expect(firstOf(result.licenseFile)).toEqual({
			data: { type: 'unknown' },
			source: 'license.txt',
		})
	})

	it('should keep empty arrays in source records', async () => {
		const result = await getMetadata({
			absolute: false,
			path: 'test/fixtures/xcode-info-plist-discovery/openframeworks-cmake-app',
			sources: ['xcodeInfoPlist'],
		})

		// Every naming field in this plist is an Xcode build variable, leaving
		// only the required arrays
		expect(firstOf(result.xcodeInfoPlist)).toEqual({
			data: { operatingSystems: [], processorRequirements: [] },
			source: 'openFrameworks-Info.plist',
		})
	})

	// Besides all-sources, each fixture's raw output once broke a template when
	// empty arrays or objects were stripped from it
	it.each([
		'all-sources',
		'go-go-mod/180yu-1',
		'java-pom-xml/a466350665-smart-sso',
		'java-pom-xml/astewart27-aem-component-generator',
		'java-pom-xml/bss-t-flink-practice',
		'openframeworks-addon-config-mk/thomasgeissl-ofxquick',
		'python-pkg-info/nakagami-reportlab',
		'python-setup-cfg/colinduquesnoy-qdarkstylesheet',
		'python-setup-py/dakomura-histo-patch',
		'ruby-gemspec/18810625123-ld',
		'ruby-gemspec/a-rom-gem-team1misson2',
		'ruby-gemspec/aisaac-lab-aisaac',
		'ruby-gemspec/andrenth-ruby-managesieve',
		'xcode-info-plist/ccfcheng-react-native-web-demo',
		'xcode-info-plist-discovery/openframeworks-cmake-app',
	])(
		'should return raw output from %s that templates read like the live context',
		async (fixture) => {
			const options = {
				offline: true,
				path: `test/fixtures/${fixture}`,
				// The metascope source records a duration that differs between runs
				sources: sourceNames.filter((name) => name !== 'metascope'),
				workspaces: false,
			}
			// eslint-disable-next-line unicorn/prefer-structured-clone -- The test needs JSON's lossy serialization, which structuredClone does not perform
			const serialized = JSON.parse(JSON.stringify(await getMetadata(options))) as MetadataContext
			let live: MetadataContext | undefined
			await getMetadata({
				...options,
				template(context) {
					live = context
					return {}
				},
			})

			for (const template of Object.values(templates)) {
				expect(template(serialized, {})).toEqual(template(live!, {}))
			}
		},
	)
})
