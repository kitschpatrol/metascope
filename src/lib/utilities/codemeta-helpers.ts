/**
 * Helpers for building codemeta JSON-LD objects.
 *
 * Provides type-safe constructors for Person/Organization and
 * SoftwareApplication dependency nodes, plus deduplication and license URL
 * normalization.
 */

import is from '@sindresorhus/is'
import { spdxIdToUrl, toCanonicalSpdxId } from './license-identification'
import { stripUndefined } from './template-helpers'

const PERSON_EMAIL_PREFIX_REGEX = /^mailto:/iv
const PERSON_NAME_WHITESPACE_REGEX = /\s+/gv

// ─── JSON-LD Output Types ──────────────────────────────────────────

/**
 * An Organization node in codemeta JSON-LD.
 */
export type CodemetaOrganizationLd = {
	'@type': 'Organization'
	name: string
}

/**
 * A Person or Organization node in codemeta JSON-LD.
 */
export type CodemetaPersonOrOrgLd = {
	'@id'?: string
	'@type': 'Organization' | 'Person'
	affiliation?: CodemetaOrganizationLd
	email?: string
	familyName?: string
	givenName?: string
	name?: string
	url?: string
}

/**
 * A software dependency node in codemeta JSON-LD.
 */
export type CodemetaDependencyLd = {
	'@type': 'SoftwareApplication' | 'SoftwareSourceCode'
	author?: CodemetaPersonOrOrgLd[]
	codeRepository?: string
	identifier?: string
	name: string
	runtimePlatform?: string
	url?: string
	version?: string
}

// ─── Person Construction ────────────────────────────────────────────

/**
 * Build a codemeta JSON-LD Person or Organization from flexible inputs. Returns
 * undefined if no identifying information (name, givenName+familyName, or
 * email) is present.
 *
 * Works with person shapes from any metascope source — the caller maps
 * source-specific field names into this common parameter object.
 */
export function toPersonOrOrgLd(options: {
	affiliation?: string
	email?: string
	familyName?: string
	givenName?: string
	id?: string
	name?: string
	type?: 'Organization' | 'Person'
	url?: string
}): CodemetaPersonOrOrgLd | undefined {
	const hasName = is.nonEmptyStringAndNotWhitespace(options.name)
	const hasGivenName = is.nonEmptyStringAndNotWhitespace(options.givenName)
	const hasFamilyName = is.nonEmptyStringAndNotWhitespace(options.familyName)
	const hasEmail = is.nonEmptyStringAndNotWhitespace(options.email)

	if (!hasName && !hasGivenName && !hasFamilyName && !hasEmail) {
		return undefined
	}

	const person: CodemetaPersonOrOrgLd = { '@type': options.type ?? 'Person' }
	if (is.nonEmptyStringAndNotWhitespace(options.id)) {
		person['@id'] = options.id
	}

	if (hasName) {
		person.name = options.name
	}

	if (hasGivenName) {
		person.givenName = options.givenName
	}

	if (hasFamilyName) {
		person.familyName = options.familyName
	}

	if (hasEmail) {
		person.email = options.email
	}

	if (is.nonEmptyStringAndNotWhitespace(options.url)) {
		person.url = options.url
	}

	if (is.nonEmptyStringAndNotWhitespace(options.affiliation)) {
		person.affiliation = { '@type': 'Organization', name: options.affiliation }
	}

	return person
}

/**
 * Deduplicate persons by name (case-insensitive, trimmed), keeping the first
 * occurrence unless that name identifies conflicting people or organizations.
 * Callers should place higher-priority sources first. Returns undefined if
 * empty.
 */
export function deduplicatePersonsOrOrgs(
	persons: CodemetaPersonOrOrgLd[],
): CodemetaPersonOrOrgLd[] | undefined {
	const groups = new Map<string, CodemetaPersonOrOrgLd[]>()
	for (const person of persons) {
		const fullName = [person.givenName, person.familyName].filter(Boolean).join(' ')
		const key = (person.name ?? (fullName === '' ? undefined : fullName) ?? person.email ?? '')
			.toLowerCase()
			.trim()
		if (key.length === 0) {
			continue
		}

		const group = groups.get(key) ?? []
		group.push(person)
		groups.set(key, group)
	}

	const retained = new Set<CodemetaPersonOrOrgLd>()
	for (const group of groups.values()) {
		const hasConflict = group.some((a) => group.some((b) => personMatchStrength(a, b) === 0))
		const uniquePersons = hasConflict ? group : group.slice(0, 1)
		for (const person of uniquePersons) {
			retained.add(person)
		}
	}

	const result = persons.filter((person) => retained.delete(person))
	return result.length > 0 ? result : undefined
}

/**
 * Resolve one role's people or organizations, ignoring undefined entries.
 * Ecosystem membership, order, and defined fields take precedence; CodeMeta
 * fills missing fields only when both records have a unique best match. Exact
 * JSON-LD `@id` matches outrank case-insensitive email matches, which outrank
 * normalized names (including givenName plus familyName). Conflicting IDs or
 * types never match, and conflicting emails prevent name-only matches. CodeMeta
 * supplies the whole list when the ecosystem list is empty. Retains name
 * deduplication for unambiguous identities and returns fresh JSON-LD records,
 * including affiliations, without changing either input.
 */
export function resolvePersonsOrOrgs(
	ecosystemPersons: Array<CodemetaPersonOrOrgLd | undefined>,
	fallbackPersons: Array<CodemetaPersonOrOrgLd | undefined> = [],
): CodemetaPersonOrOrgLd[] | undefined {
	const ecosystem = deduplicatePersonsOrOrgs(ecosystemPersons.filter((p) => p !== undefined))
	const fallback = fallbackPersons.filter((p) => p !== undefined)
	if (ecosystem === undefined) {
		return structuredClone(deduplicatePersonsOrOrgs(fallback))
	}

	// Keep all fallback candidates so duplicate names cannot hide ambiguity.
	const strengths = ecosystem.map((person) =>
		fallback.map((candidate) => personMatchStrength(person, candidate)),
	)
	return ecosystem.map((person, index) => {
		const scores = strengths[index]!
		const best = Math.max(0, ...scores)
		const matchIndex = scores.indexOf(best)
		const reverseScores = strengths.map((row) => row[matchIndex] ?? 0)
		const isUniqueMatch =
			best > 0 &&
			scores.filter((score) => score === best).length === 1 &&
			Math.max(...reverseScores) === best &&
			reverseScores.filter((score) => score === best).length === 1
		const match = isUniqueMatch ? fallback[matchIndex] : undefined
		return structuredClone({ ...match, ...stripUndefined(person) })
	})
}

/** Compare identities without changing their original field values. */
function personMatchStrength(a: CodemetaPersonOrOrgLd, b: CodemetaPersonOrOrgLd): number {
	if (a['@type'] !== b['@type']) {
		return 0
	}

	const aId = a['@id']?.trim()
	const bId = b['@id']?.trim()
	if (is.nonEmptyString(aId) && is.nonEmptyString(bId)) {
		return aId === bId ? 3 : 0
	}

	const aEmail = normalizePersonEmail(a.email)
	const bEmail = normalizePersonEmail(b.email)
	if (aEmail !== '' && bEmail !== '') {
		return aEmail === bEmail ? 2 : 0
	}

	const bNames = personNames(b)
	return personNames(a).some((name) => bNames.includes(name)) ? 1 : 0
}

function normalizePersonEmail(email = ''): string {
	return email.trim().replace(PERSON_EMAIL_PREFIX_REGEX, '').toLowerCase()
}

function personNames(person: CodemetaPersonOrOrgLd): string[] {
	return [person.name ?? '', [person.givenName, person.familyName].filter(Boolean).join(' ')]
		.map((name) =>
			name.normalize('NFC').trim().replaceAll(PERSON_NAME_WHITESPACE_REGEX, ' ').toLowerCase(),
		)
		.filter((name) => name !== '')
}

// ─── Dependency Construction ────────────────────────────────────────

/**
 * Build a codemeta JSON-LD dependency node. Defaults to `SoftwareApplication`
 * unless `details.type` says otherwise, and omits empty fields.
 */
export function toDependencyLd(
	name: string,
	version?: string,
	identifier?: string,
	runtimePlatform?: string,
	details?: {
		author?: CodemetaPersonOrOrgLd[]
		codeRepository?: string
		type?: CodemetaDependencyLd['@type']
		url?: string
	},
): CodemetaDependencyLd {
	const dependency: CodemetaDependencyLd = {
		'@type': details?.type ?? 'SoftwareApplication',
		name,
	}
	if (is.nonEmptyStringAndNotWhitespace(version)) {
		dependency.version = version
	}

	if (is.nonEmptyStringAndNotWhitespace(identifier)) {
		dependency.identifier = identifier
	}

	if (is.nonEmptyStringAndNotWhitespace(runtimePlatform)) {
		dependency.runtimePlatform = runtimePlatform
	}

	if (is.nonEmptyStringAndNotWhitespace(details?.codeRepository)) {
		dependency.codeRepository = details.codeRepository
	}

	if (is.nonEmptyStringAndNotWhitespace(details?.url)) {
		dependency.url = details.url
	}

	if (details?.author !== undefined && details.author.length > 0) {
		dependency.author = details.author
	}

	return dependency
}

/**
 * Enrich manifest dependencies with matching codemeta.json entries, then append
 * the codemeta.json entries that match nothing. Entries match when either one's
 * name or identifier equals the other's (case-insensitive). The manifest keeps
 * the fields it sets, except that a manifest name which is only its identifier
 * (e.g. a cinderblock.xml block id) yields to the codemeta.json name. Manifests
 * never declare a type, so the codemeta.json `@type` wins.
 */
export function mergeCodemetaDependencies(
	manifestDependencies: CodemetaDependencyLd[],
	codemetaDependencies: CodemetaDependencyLd[],
): CodemetaDependencyLd[] {
	const unmatched = [...codemetaDependencies]
	const merged = manifestDependencies.map((manifestDependency) => {
		const matchIndex = unmatched.findIndex((codemetaDependency) =>
			dependenciesMatch(manifestDependency, codemetaDependency),
		)
		const codemetaDependency = unmatched[matchIndex]
		if (codemetaDependency === undefined) {
			return manifestDependency
		}

		unmatched.splice(matchIndex, 1)
		const nameIsIdentifier =
			manifestDependency.identifier !== undefined &&
			manifestDependency.name === manifestDependency.identifier
		return {
			...codemetaDependency,
			...manifestDependency,
			'@type': codemetaDependency['@type'],
			name: nameIsIdentifier ? codemetaDependency.name : manifestDependency.name,
		}
	})

	return [...merged, ...unmatched]
}

/**
 * Copy authors from matching codemeta.json entries onto package manager
 * dependencies, since package manager manifests can't declare dependency
 * authors. Matching follows `mergeCodemetaDependencies`. Unmatched
 * codemeta.json entries are dropped, because the manifest decides which
 * dependencies exist.
 */
export function addCodemetaDependencyAuthors(
	manifestDependencies: CodemetaDependencyLd[],
	codemetaDependencies: CodemetaDependencyLd[],
): CodemetaDependencyLd[] {
	return manifestDependencies.map((manifestDependency) => {
		const author = codemetaDependencies.find((codemetaDependency) =>
			dependenciesMatch(manifestDependency, codemetaDependency),
		)?.author
		return author === undefined ? manifestDependency : { ...manifestDependency, author }
	})
}

/**
 * True if either dependency's name or identifier equals one of the other's,
 * ignoring case.
 */
function dependenciesMatch(a: CodemetaDependencyLd, b: CodemetaDependencyLd): boolean {
	const keysOf = (dependency: CodemetaDependencyLd) =>
		[dependency.name, dependency.identifier]
			.filter((key) => key !== undefined)
			.map((key) => key.toLowerCase().trim())
			.filter((key) => key.length > 0)
	const bKeys = new Set(keysOf(b))
	return keysOf(a).some((key) => bKeys.has(key))
}

/**
 * Deduplicate dependencies by name (case-insensitive). Keeps the first
 * occurrence. Returns undefined if the result is empty.
 */
export function deduplicateDependencies(
	dependencies: CodemetaDependencyLd[],
): CodemetaDependencyLd[] | undefined {
	const seen = new Map<string, CodemetaDependencyLd>()
	for (const dependency of dependencies) {
		const key = dependency.name.toLowerCase().trim()
		if (key.length > 0 && !seen.has(key)) {
			seen.set(key, dependency)
		}
	}

	const result = seen.values().toArray()
	return result.length > 0 ? result : undefined
}

// ─── License ────────────────────────────────────────────────────────

/**
 * Normalize a license identifier to an SPDX URL. Handles bare SPDX IDs ("MIT"),
 * matched case-insensitively, and existing SPDX URLs. Anything that isn't a
 * single known SPDX ID, like a license expression ("MIT OR Apache-2.0") or free
 * text ("MIT + Proprietary"), is returned unchanged.
 */
export function toSpdxLicenseUrl(license: string): string {
	const cleaned = license
		.replace('https://spdx.org/licenses/', '')
		// eslint-disable-next-line unicorn/prefer-https
		.replace('http://spdx.org/licenses/', '')
	const spdxId = toCanonicalSpdxId(cleaned)
	return spdxId === undefined ? license : spdxIdToUrl(spdxId)
}

const SEE_LICENSE_IN_REGEX = /^see license in /iv

/**
 * Detect npm package.json sentinel license values that are not SPDX
 * identifiers: `"UNLICENSED"` (proprietary, all rights reserved) and `"SEE
 * LICENSE IN <file>"` (defer to a license file). These should be passed through
 * as literal strings, not wrapped in a fabricated SPDX URL.
 *
 * @see https://docs.npmjs.com/cli/v11/configuring-npm/package-json#license
 */
export function isProprietaryLicenseSentinel(value: string): boolean {
	const trimmed = value.trim()
	return trimmed.toLowerCase() === 'unlicensed' || SEE_LICENSE_IN_REGEX.test(trimmed)
}
