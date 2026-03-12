import { describe, expect, it } from 'vitest'
import { getMetadata } from '../src/lib/metadata'
import { defineTemplate } from '../src/lib/metadata-types'
import { firstOf } from '../src/lib/utilities/template-helpers'

// @case-police-ignore github

describe('getMetadata', { timeout: 30_000 }, () => {
	it('should return metadata with nodePackageJson and git sources', async () => {
		const result = await getMetadata({ path: '.' })

		// Should have package.json data
		expect(result.nodePackageJson).toBeDefined()
		expect(firstOf(result.nodePackageJson)!.data.name).toBe('metascope')

		// Should have git statistics data
		expect(result.gitStats).toBeDefined()
		expect(firstOf(result.gitStats)!.data.branchCurrent).toBe('main')
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
		for (const [, value] of Object.entries(result)) {
			if (typeof value === 'object' && !Array.isArray(value)) {
				expect(Object.keys(value).length).toBeGreaterThan(0)
			}
		}
	})

	it('should apply a template function', async () => {
		const template = defineTemplate(({ gitStats, nodePackageJson }) => ({
			branch: firstOf(gitStats)?.data.branchCurrent,
			name: firstOf(nodePackageJson)?.data.name,
		}))

		const result = await getMetadata({ path: '.', template })
		expect(result).toEqual({
			branch: 'main',
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
})
