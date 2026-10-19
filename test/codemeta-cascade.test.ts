import { describe, expect, it } from 'vitest'
import type { MetadataContext } from '../src/lib/metadata-types'
import { sourceNames } from '../src/lib/metadata'
import { parse as parseCodemetaJson } from '../src/lib/sources/codemeta-json'
import { codemeta } from '../src/lib/templates/codemeta'
import { metadata } from '../src/lib/templates/metadata'

const emptyContext = Object.fromEntries(
	sourceNames.map((name) => [name, undefined]),
) as MetadataContext

function codemetaJsonRecord(content: Record<string, unknown>): MetadataContext['codemetaJson'] {
	return { data: parseCodemetaJson(JSON.stringify(content))!, source: 'codemeta.json' }
}

function packageJsonRecord(
	fields: Record<string, unknown> = {},
): MetadataContext['nodePackageJson'] {
	return {
		data: {
			// eslint-disable-next-line ts/naming-convention
			_id: 'package-name@1.0.0',
			name: 'package-name',
			readme: '',
			version: '1.0.0',
			...fields,
		},
		source: 'package.json',
	}
}

function gitConfigRecord(remoteUrl: string): MetadataContext['gitConfig'] {
	return { data: { remote: { origin: { url: remoteUrl } } }, source: '.git/config' }
}

const authoredRequirements = [
	{
		'@type': 'SoftwareApplication',
		author: [{ '@type': 'Person', email: 'ada@example.com', name: 'Ada' }],
		name: 'react',
	},
	{ '@type': 'SoftwareApplication', author: 'Grace', name: 'Vendor SDK' },
]

describe('dependency authors in the CodeMeta cascade', () => {
	it('should keep authors on codemeta.json dependencies', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({ softwareRequirements: authoredRequirements }),
		}

		expect(codemeta(context, {}).softwareRequirements).toEqual([
			{
				'@type': 'SoftwareApplication',
				author: [{ '@type': 'Person', email: 'ada@example.com', name: 'Ada' }],
				name: 'react',
			},
			{
				'@type': 'SoftwareApplication',
				author: [{ '@type': 'Person', name: 'Grace' }],
				name: 'Vendor SDK',
			},
		])
	})

	it('should add codemeta.json authors to matching package manager dependencies', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({ softwareRequirements: authoredRequirements }),
			nodePackageJson: packageJsonRecord({ dependencies: { lodash: '^4.0.0', react: '^19.0.0' } }),
		}

		const { softwareRequirements } = codemeta(context, {})
		expect(softwareRequirements?.map((d) => d.name)).toEqual(['lodash', 'react'])
		expect(softwareRequirements?.[0]?.author).toBeUndefined()
		expect(softwareRequirements?.[1]).toMatchObject({
			author: [{ '@type': 'Person', email: 'ada@example.com', name: 'Ada' }],
			version: '^19.0.0',
		})
	})

	it('should add codemeta.json authors to matching development dependencies', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				softwareSuggestions: [{ author: 'Ada', name: 'vitest' }],
			}),
			nodePackageJson: packageJsonRecord({ devDependencies: { vitest: '^4.0.0' } }),
		}

		expect(codemeta(context, {}).softwareSuggestions).toEqual([
			expect.objectContaining({ author: [{ '@type': 'Person', name: 'Ada' }], name: 'vitest' }),
		])
	})

	it('should produce the same dependency authors when its output is read back', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({ softwareRequirements: authoredRequirements }),
		}
		const generated = codemeta(context, {})
		const regenerated = codemeta(
			{ ...emptyContext, codemetaJson: codemetaJsonRecord(generated) },
			{},
		)

		expect(regenerated.softwareRequirements).toEqual(generated.softwareRequirements)
	})
})

describe('git remote in the CodeMeta cascade', () => {
	it('should use the git remote when there is no GitHub data', () => {
		const context = { ...emptyContext, gitConfig: gitConfigRecord('git@gitlab.com:owner/repo.git') }

		expect(codemeta(context, {}).codeRepository).toBe('https://gitlab.com/owner/repo')
	})

	it('should prefer GitHub data over the git remote', () => {
		const context = {
			...emptyContext,
			gitConfig: gitConfigRecord('git@github.com:owner/old-name.git'),
			github: { data: { url: 'https://github.com/owner/new-name' }, source: 'owner/old-name' },
		}

		expect(codemeta(context, {}).codeRepository).toBe('https://github.com/owner/new-name')
	})

	it('should prefer the git remote over a manifest repository', () => {
		const context = {
			...emptyContext,
			gitConfig: gitConfigRecord('git@github.com:fork/repo.git'),
			nodePackageJson: packageJsonRecord({
				repository: { type: 'git', url: 'https://github.com/upstream/repo' },
			}),
		}

		expect(codemeta(context, {}).codeRepository).toBe('https://github.com/fork/repo')
	})

	it('should give metadata.json a homepage from the git remote', () => {
		const context = { ...emptyContext, gitConfig: gitConfigRecord('git@github.com:owner/repo.git') }

		expect(metadata(context, {}).homepage).toBe('https://github.com/owner/repo')
	})
})
