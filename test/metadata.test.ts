import { describe, expect, it } from 'vitest'
import { getMetadata } from '../src/lib/metadata'
import { defineTemplate } from '../src/lib/metadata-types'

// @case-police-ignore github

describe('getMetadata', () => {
	it('should return metadata with codemeta and git sources', async () => {
		const result = await getMetadata({ path: '.' })

		// Should have codemeta data
		expect(result.codemeta).toBeDefined()
		expect(result.codemeta.name).toBe('metascope')

		// Should have git data
		expect(result.git).toBeDefined()
		expect(result.git.branchCurrent).toBe('main')
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
		for (const [, value] of Object.entries(result)) {
			if (typeof value === 'object') {
				expect(Object.keys(value as Record<string, unknown>).length).toBeGreaterThan(0)
			}
		}
	})

	it('should apply a template function', async () => {
		const template = defineTemplate(({ codemeta, git }) => ({
			branch: git.branchCurrent,
			name: codemeta.name,
		}))

		const result = await getMetadata({ path: '.', template })
		expect(result).toEqual({
			branch: 'main',
			name: 'metascope',
		})
	})

	it('should strip undefined from template output', async () => {
		const template = defineTemplate(({ obsidian }) => ({
			downloads: obsidian.downloadCount,
		}))

		const result = await getMetadata({ path: '.', template })
		// Obsidian source is not available (no obsidian-plugin keyword), so downloadCount is undefined
		// stripUndefined should remove it, resulting in empty object (which is also stripped)
		expect(result).not.toHaveProperty('downloads')
	})

	it('should resolve path to absolute', async () => {
		// Passing relative path should work
		const result = await getMetadata({ path: '.' })
		expect(result.codemeta).toBeDefined()
	})

	it('should handle built-in template name', async () => {
		const result = await getMetadata({ path: '.', template: 'summary' })
		// Built-in template should return a shaped object
		expect(result).toHaveProperty('name')
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
})
