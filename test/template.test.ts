import { describe, expect, it } from 'vitest'
import type { MetadataContext, TemplateData } from '../src/lib/metadata-types'
import { defineTemplate } from '../src/lib/metadata-types'
import { codemeta } from '../src/lib/templates/codemeta'
import { firstOf } from '../src/lib/utilities/formatting'

const mockContext: MetadataContext = {
	arduinoLibraryProperties: undefined,
	cinderCinderblockXml: undefined,
	codemetaJson: {
		data: {
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
		source: '/test/project/codemeta.json',
	},
	codeStats: {
		data: {
			perLanguage: [
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
		source: 'test',
	},
	dependencyUpdates: undefined,
	fileStats: {
		data: {
			totalDirectoryCount: 20,
			totalFileCount: 150,
			totalSizeBytes: 1_048_576,
		},
		source: 'test',
	},
	gitConfig: {
		data: {
			config: {},
		},
		source: 'test',
	},
	github: {
		data: {
			forkCount: 10,
			issueCountClosed: 3,
			issueCountOpen: 5,
			stargazerCount: 100,
		},
		source: 'test',
	},
	gitStats: {
		data: {
			branchCurrent: 'main',
			commitCount: 42,
			isClean: true,
			isDirty: false,
		},
		source: 'test',
	},
	goGoMod: undefined,
	goGoreleaserYaml: undefined,
	javaPomXml: undefined,
	licenseFile: [],
	metadataFile: undefined,
	metascope: {
		data: {
			durationMs: 100,
			options: {
				path: 'test',
			},
			scannedAt: '2026-01-01T00:00:00.000Z',
			version: '0.0.0',
			workspaceDirectories: [],
		},
		source: 'test',
	},
	nodeNpmRegistry: {
		data: {
			downloadsWeekly: 1000,
		},
		source: 'test',
	},
	nodePackageJson: {
		data: {
			// eslint-disable-next-line ts/naming-convention
			_id: 'test-package@1.2.3',
			name: 'test-package',
			readme: '',
			version: '1.2.3',
		},
		source: '/test/project/package.json',
	},
	obsidianPluginManifestJson: undefined,
	obsidianPluginRegistry: undefined,
	openframeworksAddonConfigMk: undefined,
	openframeworksInstallXml: undefined,
	processingLibraryProperties: undefined,
	processingSketchProperties: undefined,
	publiccodeYaml: undefined,
	pythonPkgInfo: undefined,
	pythonPypiRegistry: undefined,
	pythonPyprojectToml: undefined,
	pythonSetupCfg: undefined,
	pythonSetupPy: undefined,
	readmeFile: undefined,
	rubyGemspec: undefined,
	rustCargoToml: undefined,
	xcodeInfoPlist: undefined,
	xcodeProjectPbxproj: undefined,
}

const identityFunction = (context: MetadataContext) => ({
	name: firstOf(context.codemetaJson)?.data.name,
})

describe('defineTemplate', () => {
	it('should be an identity function', () => {
		const template = defineTemplate(identityFunction)
		expect(template).toBe(identityFunction)
	})

	it('should produce the expected output shape', () => {
		const template = defineTemplate(({ codemetaJson, github }) => ({
			name: firstOf(codemetaJson)?.data.name,
			stars: firstOf(github)?.data.stargazerCount,
		}))

		const result = template(mockContext, {})
		expect(result).toEqual({
			name: 'test-package',
			stars: 100,
		})
	})

	it('should support string interpolation', () => {
		const template = defineTemplate(({ codemetaJson }) => {
			const firstAuthor = firstOf(codemetaJson)?.data.author?.[0]
			return {
				author: `${firstAuthor?.givenName ?? ''} ${firstAuthor?.familyName ?? ''}`.trim(),
			}
		})

		const result = template(mockContext, {})
		expect(result).toEqual({ author: 'John Doe' })
	})

	it('should support computed values', () => {
		const template = defineTemplate(({ github }) => ({
			popularity:
				(firstOf(github)?.data.stargazerCount ?? 0) + (firstOf(github)?.data.forkCount ?? 0),
		}))

		const result = template(mockContext, {})
		expect(result).toEqual({ popularity: 110 })
	})

	it('should handle missing optional fields gracefully', () => {
		const template = defineTemplate(({ github }) => ({
			hasWikiEnabled: firstOf(github)?.data.hasWikiEnabled,
			homepageUrl: firstOf(github)?.data.homepageUrl,
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
			name: firstOf(context.codemetaJson)?.data.name,
		})
		const template = defineTemplate(singleArgumentTemplate)

		const result = template(mockContext, {})
		expect(result).toEqual({ name: 'test-package' })
	})
})

describe('codemeta template', () => {
	it('should produce a valid JSON-LD structure', () => {
		const result = codemeta(mockContext, {})
		expect(result['@context']).toBe('https://w3id.org/codemeta/3.0')
		expect(result['@type']).toBe('SoftwareSourceCode')
	})

	it('should prefer ecosystem sources (package.json) over codemetaJson for name/version', () => {
		const result = codemeta(mockContext, {})
		// The package.json has name and version, same as codemetaJson in mock
		expect(result.name).toBe('test-package')
		expect(result.version).toBe('1.2.3')
	})

	it('should fall back to codemetaJson when no ecosystem source is present', () => {
		const contextWithoutEcosystem: MetadataContext = {
			...mockContext,
			nodePackageJson: undefined,
		}
		const result = codemeta(contextWithoutEcosystem, {})
		expect(result.name).toBe('test-package')
		expect(result.description).toBe('A test package')
	})

	it('should convert author from codemetaJson to JSON-LD Person when no ecosystem author', () => {
		const contextWithoutPackageAuthor: MetadataContext = {
			...mockContext,
			// Package.json has no author field in the mock
		}
		const result = codemeta(contextWithoutPackageAuthor, {})
		expect(result.author).toEqual([
			{
				'@type': 'Person',
				familyName: 'Doe',
				givenName: 'John',
			},
		])
	})

	it('should prefer package.json author over codemetaJson author', () => {
		const contextWithPackageAuthor: MetadataContext = {
			...mockContext,
			nodePackageJson: {
				data: {
					// eslint-disable-next-line ts/naming-convention
					_id: 'test@1.0.0',
					author: { email: 'jane@example.com', name: 'Jane Smith' },
					name: 'test',
					readme: '',
					version: '1.0.0',
				},
				source: 'package.json',
			},
		}
		const result = codemeta(contextWithPackageAuthor, {})
		expect(result.author).toEqual([
			{ '@type': 'Person', email: 'jane@example.com', name: 'Jane Smith' },
		])
	})

	it('should collect dependencies from package.json', () => {
		const contextWithDeps: MetadataContext = {
			...mockContext,
			nodePackageJson: {
				data: {
					// eslint-disable-next-line ts/naming-convention
					_id: 'test@1.0.0',
					dependencies: { express: '^4.18.0', lodash: '^4.17.21' },
					devDependencies: { vitest: '^1.0.0' },
					name: 'test',
					readme: '',
					version: '1.0.0',
				},
				source: 'package.json',
			},
		}
		const result = codemeta(contextWithDeps, {})
		expect(result.softwareRequirements).toEqual([
			{ '@type': 'SoftwareApplication', name: 'express', version: '^4.18.0' },
			{ '@type': 'SoftwareApplication', name: 'lodash', version: '^4.17.21' },
		])
		expect(result.softwareSuggestions).toEqual([
			{ '@type': 'SoftwareApplication', name: 'vitest', version: '^1.0.0' },
		])
	})

	it('should normalize license to SPDX URL', () => {
		const contextWithLicense: MetadataContext = {
			...mockContext,
			nodePackageJson: {
				data: {
					// eslint-disable-next-line ts/naming-convention
					_id: 'test@1.0.0',
					license: 'MIT',
					name: 'test',
					readme: '',
					version: '1.0.0',
				},
				source: 'package.json',
			},
		}
		const result = codemeta(contextWithLicense, {})
		expect(result.license).toBe('https://spdx.org/licenses/MIT')
	})

	it('should truncate dates to date-only format', () => {
		const contextWithDates: MetadataContext = {
			...mockContext,
			gitStats: {
				data: {
					commitDateFirst: '2024-01-15T10:30:00Z',
					commitDateLast: '2025-06-20T14:00:00Z',
				},
				source: 'test',
			},
		}
		const result = codemeta(contextWithDates, {})
		expect(result.dateCreated).toBe('2024-01-15')
		expect(result.dateModified).toBe('2025-06-20')
	})

	it('should merge keywords from multiple sources and deduplicate', () => {
		const contextWithKeywords: MetadataContext = {
			...mockContext,
			codemetaJson: {
				data: {
					keywords: ['typescript', 'metadata'],
					name: 'test',
				},
				source: 'codemeta.json',
			},
			github: {
				data: { topics: ['TypeScript', 'cli'] },
				source: 'test',
			},
			nodePackageJson: {
				data: {
					// eslint-disable-next-line ts/naming-convention
					_id: 'test@1.0.0',
					keywords: ['metadata', 'tools'],
					name: 'test',
					readme: '',
					version: '1.0.0',
				},
				source: 'package.json',
			},
		}
		const result = codemeta(contextWithKeywords, {})
		// 'metadata' appears twice (package.json + codemeta), 'typescript'/'TypeScript' deduplicated
		// First occurrence wins: 'TypeScript' from github.topics appears before 'typescript' from codemeta
		expect(result.keywords).toEqual(['metadata', 'tools', 'TypeScript', 'cli'])
	})

	it('should preserve codemeta-specific fields from existing codemeta.json', () => {
		const contextWithCodemetaSpecific: MetadataContext = {
			...mockContext,
			codemetaJson: {
				data: {
					buildInstructions: 'https://example.com/build',
					developmentStatus: 'https://www.repostatus.org/#active',
					funding: 'NSF grant #12345',
					name: 'test',
				},
				source: 'codemeta.json',
			},
		}
		const result = codemeta(contextWithCodemetaSpecific, {})
		expect(result.developmentStatus).toBe('https://www.repostatus.org/#active')
		expect(result.funding).toBe('NSF grant #12345')
		expect(result.buildInstructions).toBe('https://example.com/build')
	})

	it('should strip undefined values from output', () => {
		const result = codemeta(mockContext, {})
		const json = JSON.stringify(result)
		expect(json).not.toContain('undefined')
		// Verify specific absent fields are truly gone
		expect(result).not.toHaveProperty('downloadUrl')
		expect(result).not.toHaveProperty('installUrl')
	})

	it('should produce stable round-trip output', () => {
		// Simulate: generate codemeta from package.json → save → regenerate
		const run1 = codemeta(mockContext, {})

		// Second run: codemetaJson now has the values from run1.
		// The codemetaJson source parser strips @-prefixed keys and normalizes:
		// @type → type, @id → id. We simulate that here using the same
		// author data that's in the mock codemetaJson (which is what the
		// codemetaJson source would produce after parsing the saved output).
		const contextWithSavedCodemeta: MetadataContext = {
			...mockContext,
			codemetaJson: {
				data: {
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
				source: 'codemeta.json',
			},
		}

		const run2 = codemeta(contextWithSavedCodemeta, {})
		expect(run2).toEqual(run1)
	})

	it('should handle completely empty context', () => {
		const emptyContext: MetadataContext = {
			...mockContext,
			codemetaJson: undefined,
			codeStats: undefined,
			fileStats: undefined,
			gitConfig: undefined,
			github: undefined,
			gitStats: undefined,
			licenseFile: undefined,
			metascope: undefined,
			nodeNpmRegistry: undefined,
			nodePackageJson: undefined,
		}
		const result = codemeta(emptyContext, {})
		expect(result['@context']).toBe('https://w3id.org/codemeta/3.0')
		expect(result['@type']).toBe('SoftwareSourceCode')
		// Should just have the boilerplate, nothing else
		expect(Object.keys(result)).toEqual(['@context', '@type'])
	})
})
