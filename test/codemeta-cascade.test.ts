import { describe, expect, it } from 'vitest'
import type { MetadataContext } from '../src/lib/metadata-types'
import type { CodemetaPersonOrOrgLd } from '../src/lib/utilities/codemeta-helpers'
import { sourceNames } from '../src/lib/metadata'
import { parse as parseArduinoLibraryProperties } from '../src/lib/sources/arduino-library-properties'
import { parse as parseCodemetaJson } from '../src/lib/sources/codemeta-json'
import { codemeta } from '../src/lib/templates/codemeta'
import { metadata } from '../src/lib/templates/metadata'
import { resolvePersonsOrOrgs } from '../src/lib/utilities/codemeta-helpers'

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

describe('people in the CodeMeta cascade', () => {
	it('should retain Brain author and maintainer URLs from codemeta.json', () => {
		const person = {
			'@type': 'Person',
			email: 'eric@ericmika.com',
			name: 'Eric Mika',
			url: 'https://ericmika.com',
		}
		const context = {
			...emptyContext,
			arduinoLibraryProperties: {
				data: parseArduinoLibraryProperties(
					'name=Brain\nauthor=Eric Mika <eric@ericmika.com>\nmaintainer=Eric Mika <eric@ericmika.com>',
				),
				source: 'library.properties',
			},
			codemetaJson: codemetaJsonRecord({ author: person, maintainer: person }),
		}

		expect(codemeta(context, {})).toMatchObject({ author: [person], maintainer: [person] })
	})

	it.each(['author', 'contributor', 'maintainer'] as const)(
		'should keep ecosystem %s fields ahead of matching CodeMeta fields',
		(role) => {
			const ecosystemPerson = {
				email: 'ERIC@ericmika.com',
				name: 'Eric Mika',
				url: 'https://example.com/ecosystem',
			}
			const context = {
				...emptyContext,
				codemetaJson: codemetaJsonRecord({
					[role]: {
						email: 'mailto:eric@ericmika.com',
						givenName: 'Eric',
						name: 'Eric',
						url: 'https://ericmika.com',
					},
				}),
				nodePackageJson: packageJsonRecord({
					author: ecosystemPerson,
					contributors: [ecosystemPerson],
					maintainers: [ecosystemPerson],
				}),
			}

			expect(codemeta(context, {})[role]).toEqual([
				{ ...ecosystemPerson, '@type': 'Person', givenName: 'Eric' },
			])
		},
	)

	it.each([{ name: '  ERIC   mika ' }, { familyName: 'Mika', givenName: 'Eric' }])(
		'should fill all supported missing fields using an unambiguous normalized name: %j',
		(nameFields) => {
			const supplemental = {
				'@id': 'https://example.com/people/eric',
				'@type': 'Person',
				affiliation: { '@type': 'Organization', name: 'Example Lab' },
				email: 'eric@ericmika.com',
				familyName: 'Mika',
				givenName: 'Eric',
				url: 'https://ericmika.com',
				...nameFields,
			}
			const context = {
				...emptyContext,
				codemetaJson: codemetaJsonRecord({ author: supplemental }),
				nodePackageJson: packageJsonRecord({ author: { name: 'Eric Mika' } }),
			}

			expect(codemeta(context, {}).author).toEqual([{ ...supplemental, name: 'Eric Mika' }])
		},
	)

	it('should prefer an email match over a name-only candidate', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				author: [
					{ name: 'Eric Mika', url: 'https://example.com/wrong' },
					{ email: 'eric@ericmika.com', name: 'Eric', url: 'https://ericmika.com' },
				],
			}),
			nodePackageJson: packageJsonRecord({
				author: { email: 'eric@ericmika.com', name: 'Eric Mika' },
			}),
		}

		expect(codemeta(context, {}).author).toEqual([
			{
				'@type': 'Person',
				email: 'eric@ericmika.com',
				name: 'Eric Mika',
				url: 'https://ericmika.com',
			},
		])
	})

	it('should keep ecosystem membership and order without appending unrelated CodeMeta people', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				contributor: [
					{ name: 'Ada', url: 'https://example.com/ada' },
					{ name: 'Unrelated', url: 'https://example.com/unrelated' },
					{ name: 'Grace', url: 'https://example.com/grace' },
				],
			}),
			nodePackageJson: packageJsonRecord({ contributors: ['Grace', 'Ada', 'Alan'] }),
		}

		expect(codemeta(context, {}).contributor).toEqual([
			{ '@type': 'Person', name: 'Grace', url: 'https://example.com/grace' },
			{ '@type': 'Person', name: 'Ada', url: 'https://example.com/ada' },
			{ '@type': 'Person', name: 'Alan' },
		])
	})

	it('should match people only within the same role', () => {
		const person = { name: 'Eric Mika' }
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				author: { ...person, url: 'https://example.com/author' },
				maintainer: { ...person, url: 'https://example.com/maintainer' },
			}),
			nodePackageJson: packageJsonRecord({
				author: person,
				contributors: [person],
				maintainers: [person],
			}),
		}

		expect(codemeta(context, {})).toMatchObject({
			author: [{ ...person, '@type': 'Person', url: 'https://example.com/author' }],
			contributor: [{ ...person, '@type': 'Person' }],
			maintainer: [{ ...person, '@type': 'Person', url: 'https://example.com/maintainer' }],
		})
		expect(codemeta(context, {}).contributor?.[0]).not.toHaveProperty('url')
	})

	it('should leave ambiguous CodeMeta names unenriched', () => {
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				author: [
					{ email: 'first@example.com', name: 'Alex Smith', url: 'https://example.com/first' },
					{ email: 'second@example.com', name: 'Alex Smith', url: 'https://example.com/second' },
				],
			}),
			nodePackageJson: packageJsonRecord({ author: { name: 'Alex Smith' } }),
		}

		expect(codemeta(context, {}).author).toEqual([{ '@type': 'Person', name: 'Alex Smith' }])
	})

	it('should preserve distinct ecosystem people sharing a name without reusing a name-only match', () => {
		const contributors = [
			{ email: 'first@example.com', name: 'Alex Smith' },
			{ email: 'second@example.com', name: 'Alex Smith' },
		]
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				contributor: { name: 'Alex Smith', url: 'https://example.com/ambiguous' },
			}),
			nodePackageJson: packageJsonRecord({ contributors }),
		}

		expect(codemeta(context, {}).contributor).toEqual(
			contributors.map((person) => ({ ...person, '@type': 'Person' })),
		)
	})

	it('should retain CodeMeta-only people for every resolver role', () => {
		const person = {
			'@id': 'https://example.com/people/eric',
			'@type': 'Person',
			affiliation: { '@type': 'Organization', name: 'Example Lab' },
			email: 'eric@ericmika.com',
			familyName: 'Mika',
			givenName: 'Eric',
			url: 'https://ericmika.com',
		}
		const organization = {
			'@type': 'Organization',
			name: 'Example Lab',
			url: 'https://example.com',
		}
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({
				author: person,
				contributor: person,
				copyrightHolder: organization,
				funder: organization,
				maintainer: person,
			}),
		}

		expect(codemeta(context, {})).toMatchObject({
			author: [person],
			contributor: [person],
			copyrightHolder: [organization],
			funder: [organization],
			maintainer: [person],
		})
	})

	it('should preserve enriched people after generating, parsing, and regenerating CodeMeta', () => {
		const person = {
			'@id': 'https://example.com/people/eric',
			'@type': 'Person',
			affiliation: { '@type': 'Organization', name: 'Example Lab' },
			email: 'eric@ericmika.com',
			familyName: 'Mika',
			givenName: 'Eric',
			url: 'https://ericmika.com',
		}
		const context = {
			...emptyContext,
			codemetaJson: codemetaJsonRecord({ author: person, contributor: person, maintainer: person }),
			nodePackageJson: packageJsonRecord({
				author: { name: 'Eric Mika' },
				contributors: ['Eric Mika', 'Grace'],
				maintainers: ['Eric Mika'],
			}),
		}
		const before = structuredClone(context)
		const generated = codemeta(context, {})
		const regenerated = codemeta({ ...context, codemetaJson: codemetaJsonRecord(generated) }, {})

		expect(generated.author).toEqual([{ ...person, name: 'Eric Mika' }])
		expect(regenerated).toEqual(generated)
		expect(context).toEqual(before)
	})
})

describe('shared person resolver', () => {
	it('should prefer matching identifiers even when names and emails differ', () => {
		const ecosystem: CodemetaPersonOrOrgLd = {
			'@id': 'https://example.com/people/eric',
			'@type': 'Person',
			email: 'current@example.com',
			name: 'Eric Mika',
		}
		const result = resolvePersonsOrOrgs(
			[ecosystem],
			[
				{
					'@type': 'Person',
					email: 'current@example.com',
					name: 'Eric Mika',
					url: 'https://example.com/wrong',
				},
				{
					'@id': ecosystem['@id'],
					'@type': 'Person',
					email: 'old@example.com',
					name: 'Eric',
					url: 'https://ericmika.com',
				},
			],
		)

		expect(result).toEqual([{ ...ecosystem, url: 'https://ericmika.com' }])
	})

	it.each([
		{ '@id': 'https://example.com/different' },
		{ '@type': 'Organization' as const },
		{ '@id': undefined, email: 'different@example.com' },
	])('should reject conflicting identities instead of merging by name: %j', (conflict) => {
		const ecosystem: CodemetaPersonOrOrgLd = {
			'@id': 'https://example.com/people/eric',
			'@type': 'Person',
			email: 'eric@ericmika.com',
			name: 'Eric Mika',
		}

		expect(
			resolvePersonsOrOrgs(
				[ecosystem],
				[{ ...ecosystem, ...conflict, url: 'https://example.com/wrong' }],
			),
		).toEqual([ecosystem])
	})

	it('should not choose arbitrarily between equally strong email matches', () => {
		const ecosystem: CodemetaPersonOrOrgLd = { '@type': 'Person', email: 'shared@example.com' }

		expect(
			resolvePersonsOrOrgs(
				[ecosystem],
				[
					{ ...ecosystem, name: 'Ada', url: 'https://example.com/ada' },
					{ ...ecosystem, name: 'Grace', url: 'https://example.com/grace' },
				],
			),
		).toEqual([ecosystem])
	})

	it('should return fresh records and affiliations while preserving defined ecosystem fields', () => {
		const ecosystem: CodemetaPersonOrOrgLd = {
			'@type': 'Person',
			affiliation: { '@type': 'Organization', name: 'Ecosystem Lab' },
			name: 'Eric Mika',
			url: undefined,
		}
		const fallback: CodemetaPersonOrOrgLd = {
			'@type': 'Person',
			affiliation: { '@type': 'Organization', name: 'CodeMeta Lab' },
			name: 'Eric Mika',
			url: 'https://ericmika.com',
		}
		const before = structuredClone([ecosystem, fallback])
		const merged = resolvePersonsOrOrgs([undefined, ecosystem], [undefined, fallback])?.[0]
		const fallbackOnly = resolvePersonsOrOrgs([undefined], [undefined, fallback])?.[0]
		const ecosystemOnly = resolvePersonsOrOrgs([ecosystem])?.[0]

		expect(merged).toEqual({ ...ecosystem, url: fallback.url })
		expect(merged).not.toBe(ecosystem)
		expect(merged?.affiliation).not.toBe(ecosystem.affiliation)
		expect(fallbackOnly).toEqual(fallback)
		expect(fallbackOnly).not.toBe(fallback)
		expect(fallbackOnly?.affiliation).not.toBe(fallback.affiliation)
		expect(ecosystemOnly).toEqual(ecosystem)
		expect(ecosystemOnly).not.toBe(ecosystem)
		expect(ecosystemOnly?.affiliation).not.toBe(ecosystem.affiliation)
		expect([ecosystem, fallback]).toEqual(before)
		expect(resolvePersonsOrOrgs([undefined], [undefined])).toBeUndefined()
	})

	it('should retain first-occurrence deduplication and order for unambiguous ecosystem names', () => {
		const person: CodemetaPersonOrOrgLd = {
			'@type': 'Person',
			name: 'Eric Mika',
			url: 'https://ericmika.com',
		}
		const other: CodemetaPersonOrOrgLd = { '@type': 'Person', name: 'Ada' }

		expect(
			resolvePersonsOrOrgs([
				person,
				other,
				{ ...person, name: ' ERIC MIKA ', url: 'https://example.com/later' },
			]),
		).toEqual([person, other])
	})
})

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
