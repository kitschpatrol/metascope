import { describe, expect, it } from 'vitest'
import type { MetadataContext, TemplateData } from '../src/lib/metadata-types'
import { defineTemplate } from '../src/lib/metadata-types'

const mockContext: MetadataContext = {
	arduinoLibraryProperties: {},
	cinderCinderblockXml: {},
	codemetaJson: {
		author: [
			{
				familyName: 'Doe',
				givenName: 'John',
				type: 'Person',
			},
		],
		description: 'A test package',
		name: 'test-package',
		version: '1.2.3',
	},
	codeStatistics: {
		breakdown: [
			{ blanks: 100, code: 500, comments: 50, files: 10, language: 'TypeScript', lines: 650 },
		],
		total: {
			blanks: 100,
			code: 500,
			comments: 50,
			files: 10,
			languages: ['TypeScript'],
			lines: 650,
		},
	},
	dependencyUpdates: {},
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
	goGoMod: {},
	goGoreleaserYaml: {},
	javaPomXml: {},
	licenseFiles: {},
	metadataFile: {},
	metascope: {
		path: '/test/project',
		scannedAt: '2026-01-01T00:00:00.000Z',
		version: '0.0.0',
	},
	nodeNpmRegistry: {
		downloadsWeekly: 1000,
	},
	nodePackageJson: {
		// eslint-disable-next-line ts/naming-convention
		_id: 'test-package@1.2.3',
		name: 'test-package',
		readme: '',
		version: '1.2.3',
	},
	obsidianManifestJson: {},
	openframeworksAddonConfigMk: {},
	openframeworksInstallXml: {},
	processingLibraryProperties: {},
	publiccodeYaml: {},
	pythonPkgInfo: {},
	pythonPypiRegistry: {},
	pythonPyprojectToml: {},
	pythonSetupCfg: {},
	pythonSetupPy: {},
	readmeFile: {},
	rubyGemspec: {},
	rustCargoToml: {},
	xcodeInfoPlist: {},
	xcodeProjectPbxproj: {},
}

const identityFunction = (context: MetadataContext) => ({ name: context.codemetaJson.name })

describe('defineTemplate', () => {
	it('should be an identity function', () => {
		const template = defineTemplate(identityFunction)
		expect(template).toBe(identityFunction)
	})

	it('should produce the expected output shape', () => {
		const template = defineTemplate(({ codemetaJson, github }) => ({
			name: codemetaJson.name,
			stars: github.stargazerCount,
		}))

		const result = template(mockContext, {})
		expect(result).toEqual({
			name: 'test-package',
			stars: 100,
		})
	})

	it('should support string interpolation', () => {
		const template = defineTemplate(({ codemetaJson }) => {
			const firstAuthor = codemetaJson.author?.[0]
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
		const singleArgumentTemplate = (context: MetadataContext) => ({
			name: context.codemetaJson.name,
		})
		const template = defineTemplate(singleArgumentTemplate)

		const result = template(mockContext, {})
		expect(result).toEqual({ name: 'test-package' })
	})
})
