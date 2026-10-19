import { describe, expect, it } from 'vitest'
import type { MetadataContext } from '../src/lib/metadata-types'
import { sourceNames } from '../src/lib/metadata'
import { parse as parseMetadata } from '../src/lib/sources/metadata-file'
import { codemeta } from '../src/lib/templates/codemeta'
import { codemetaJson } from '../src/lib/templates/codemeta-json'

const emptyContext = Object.fromEntries(
	sourceNames.map((name) => [name, undefined]),
) as MetadataContext

const metadataRecord = {
	data: parseMetadata(
		JSON.stringify({
			description: 'A light sculpture for Disorient.',
			homepage: 'https://example.com/asterism',
			keywords: ['installation', 'led'],
			repository: 'git+https://github.com/example/asterism.git',
		}),
		'json',
	)!,
	source: 'metadata.json',
}

describe('GitHub metadata fields in the CodeMeta cascade', () => {
	it('should aggregate the existing metadata fields in both CodeMeta templates', () => {
		const context = { ...emptyContext, metadataFile: metadataRecord }
		const expected = {
			codeRepository: 'https://github.com/example/asterism',
			description: 'A light sculpture for Disorient.',
			keywords: ['installation', 'led'],
			url: 'https://example.com/asterism',
		}

		expect(codemeta(context, {})).toMatchObject(expected)
		expect(codemetaJson(context, {})).toMatchObject(expected)
	})

	it('should retain existing CodeMeta values ahead of metadata fallbacks', () => {
		const context: MetadataContext = {
			...emptyContext,
			codemetaJson: {
				data: {
					codeRepository: 'https://github.com/example/canonical',
					description: 'Canonical description.',
					keywords: ['canonical', 'led'],
					url: 'https://example.com/canonical',
				},
				source: 'codemeta.json',
			},
			metadataFile: metadataRecord,
		}

		expect(codemetaJson(context, {})).toMatchObject({
			codeRepository: 'https://github.com/example/canonical',
			description: 'Canonical description.',
			keywords: ['canonical', 'led', 'installation'],
			url: 'https://example.com/canonical',
		})
	})

	it('should fill missing fields without replacing canonical package values', () => {
		const context: MetadataContext = {
			...emptyContext,
			metadataFile: metadataRecord,
			nodePackageJson: {
				data: {
					// eslint-disable-next-line ts/naming-convention
					_id: 'package-name@1.0.0',
					keywords: ['package', 'LED'],
					name: 'package-name',
					readme: '',
					repository: { type: 'git', url: 'https://github.com/example/package' },
					version: '1.0.0',
				},
				source: 'package.json',
			},
		}

		expect(codemetaJson(context, {})).toMatchObject({
			codeRepository: 'https://github.com/example/package',
			description: 'A light sculpture for Disorient.',
			keywords: ['package', 'LED', 'installation'],
			name: 'package-name',
			url: 'https://example.com/asterism',
		})
	})

	it('should preserve README titles and ignore richer fields in metadata.json', () => {
		const context: MetadataContext = {
			...emptyContext,
			metadataFile: {
				data: parseMetadata(
					'{"description":"A sculpture.","name":"Ignored","author":"Ignored","license":"MIT"}',
					'json',
				)!,
				source: 'metadata.json',
			},
			readmeFile: { data: { name: 'README title' }, source: 'readme.md' },
		}
		const before = structuredClone(context)
		const result = codemetaJson(context, {})

		expect(result.name).toBe('README title')
		expect(result.description).toBe('A sculpture.')
		expect(result.author).toBeUndefined()
		expect(result.license).toBeUndefined()
		expect(context).toEqual(before)
	})
})
