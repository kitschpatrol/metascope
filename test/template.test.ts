import { describe, expect, it } from 'vitest'
import type { MetadataContext, TemplateData } from '../src/lib/metadata-types'
import { defineTemplate } from '../src/lib/metadata-types'

const mockContext: MetadataContext = {
	arduinoLibraryProperties: {},
	cinderCinderblock: {},
	codemeta: {
		author: [
			{
				familyName: 'Doe',
				givenName: 'John',
				type: 'Person' as const,
			},
		],
		description: 'A test package',
		name: 'test-package',
		version: '1.2.3',
	},
	filesystem: {
		totalDirectoryCount: 20,
		totalFileCount: 150,
		totalSizeBytes: 1_048_576,
	},
	git: {
		branchCurrent: 'main',
		commitCount: 42,
		config: {},
		isClean: true,
		isDirty: false,
	},
	github: {
		forkCount: 10,
		issueCountClosed: 3,
		issueCountOpen: 5,
		stargazerCount: 100,
	},
	loc: {
		breakdown: [{ blanks: 100, code: 500, comments: 50, files: 10, language: 'TypeScript', lines: 650 }],
		total: { blanks: 100, code: 500, comments: 50, files: 10, languages: ['TypeScript'], lines: 650 },
	},
	metascope: {
		path: '/test/project',
		scannedAt: '2026-01-01T00:00:00.000Z',
		version: '0.0.0',
	},
	npm: {
		downloadsWeekly: 1000,
	},
	obsidian: {},
	openFrameworksAddonConfig: {},
	processingLibraryProperties: {},
	packageJson: {
		// eslint-disable-next-line ts/naming-convention
		_id: 'test-package@1.2.3',
		name: 'test-package',
		readme: '',
		version: '1.2.3',
	},
	pypi: {},
	pyprojectToml: {},
	updates: {},
}

const identityFn = (context: MetadataContext) => ({ name: context.codemeta.name })

describe('defineTemplate', () => {
	it('should be an identity function', () => {
		const template = defineTemplate(identityFn)
		expect(template).toBe(identityFn)
	})

	it('should produce the expected output shape', () => {
		const template = defineTemplate(({ codemeta, github }) => ({
			name: codemeta.name,
			stars: github.stargazerCount,
		}))

		const result = template(mockContext, {})
		expect(result).toEqual({
			name: 'test-package',
			stars: 100,
		})
	})

	it('should support string interpolation', () => {
		const template = defineTemplate(({ codemeta }) => {
			const authors = Array.isArray(codemeta.author) ? codemeta.author : []
			// eslint-disable-next-line ts/no-unsafe-type-assertion -- Test code with known mock data shape
			const firstAuthor = authors[0] as unknown as
				| undefined
				| { familyName?: string; givenName?: string }
			return {
				author: `${firstAuthor?.givenName ?? ''} ${firstAuthor?.familyName ?? ''}`.trim(),
			}
		})

		const result = template(mockContext, {})
		expect(result).toEqual({ author: 'John Doe' })
	})

	it('should support computed values', () => {
		const template = defineTemplate(({ github }) => ({
			popularity: (github.stargazerCount ?? 0) + (github.forkCount ?? 0),
		}))

		const result = template(mockContext, {})
		expect(result).toEqual({ popularity: 110 })
	})

	it('should handle missing optional fields gracefully', () => {
		const template = defineTemplate(({ github }) => ({
			hasWikiEnabled: github.hasWikiEnabled,
			homepageUrl: github.homepageUrl,
		}))

		const result = template(mockContext, {})
		// Fields not set in mockContext are undefined
		expect(result.hasWikiEnabled).toBeUndefined()
		expect(result.homepageUrl).toBeUndefined()
	})

	it('should pass templateData to template function', () => {
		const template = defineTemplate((_context, templateData) => ({
			account: templateData.githubAccount,
			author: templateData.authorName,
		}))

		const data: TemplateData = { authorName: 'Jane Doe', githubAccount: 'fooBar' }
		const result = template(mockContext, data)
		expect(result).toEqual({ account: 'fooBar', author: 'Jane Doe' })
	})

	it('should work with empty templateData', () => {
		const template = defineTemplate((_context, templateData) => ({
			author: templateData.authorName,
		}))

		const result = template(mockContext, {})
		expect(result.author).toBeUndefined()
	})

	it('should support single-arg templates (legacy compat)', () => {
		// Templates that only use the first arg still work since
		// JS allows calling a function with more args than declared
		// eslint-disable-next-line unicorn/consistent-function-scoping
		const singleArgTemplate = (context: MetadataContext) => ({ name: context.codemeta.name })
		const template = defineTemplate(singleArgTemplate)

		const result = template(mockContext, {})
		expect(result).toEqual({ name: 'test-package' })
	})
})
