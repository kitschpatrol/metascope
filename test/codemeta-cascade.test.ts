import { describe, expect, it } from 'vitest'
import type { MetadataContext } from '../src/lib/metadata-types'
import { sourceNames } from '../src/lib/metadata'
import { parse as parseCodemetaJson } from '../src/lib/sources/codemeta-json'
import { codemeta } from '../src/lib/templates/codemeta'

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
