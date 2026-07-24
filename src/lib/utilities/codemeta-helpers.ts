/**
 * Helpers for building codemeta JSON-LD objects.
 *
 * Provides type-safe constructors for Person/Organization and
 * SoftwareApplication dependency nodes, plus deduplication and license URL
 * normalization.
 */

import is from '@sindresorhus/is'

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
	'@type': 'SoftwareApplication'
	identifier?: string
	name: string
	runtimePlatform?: string
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
 * Deduplicate persons by name (case-insensitive, trimmed). Keeps the first
 * occurrence, so callers should place higher-priority sources first. Returns
 * undefined if the result is empty.
 */
export function deduplicatePersonsOrOrgs(
	persons: CodemetaPersonOrOrgLd[],
): CodemetaPersonOrOrgLd[] | undefined {
	const seen = new Map<string, CodemetaPersonOrOrgLd>()
	for (const person of persons) {
		const fullName = [person.givenName, person.familyName].filter(Boolean).join(' ')
		const key = (person.name ?? (fullName === '' ? undefined : fullName) ?? person.email ?? '')
			.toLowerCase()
			.trim()
		if (key.length > 0 && !seen.has(key)) {
			seen.set(key, person)
		}
	}

	const result = seen.values().toArray()
	return result.length > 0 ? result : undefined
}

// ─── Dependency Construction ────────────────────────────────────────

/**
 * Build a codemeta JSON-LD SoftwareApplication dependency node.
 */
export function toDependencyLd(
	name: string,
	version?: string,
	identifier?: string,
	runtimePlatform?: string,
): CodemetaDependencyLd {
	const dependency: CodemetaDependencyLd = { '@type': 'SoftwareApplication', name }
	if (is.nonEmptyStringAndNotWhitespace(version)) {
		dependency.version = version
	}

	if (is.nonEmptyStringAndNotWhitespace(identifier)) {
		dependency.identifier = identifier
	}

	if (is.nonEmptyStringAndNotWhitespace(runtimePlatform)) {
		dependency.runtimePlatform = runtimePlatform
	}

	return dependency
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
 * Normalize a license identifier to an SPDX URL. Handles bare SPDX IDs ("MIT")
 * and existing SPDX URLs.
 */
export function toSpdxLicenseUrl(spdxId: string): string {
	const cleaned = spdxId
		.replace('https://spdx.org/licenses/', '')
		// eslint-disable-next-line unicorn/prefer-https
		.replace('http://spdx.org/licenses/', '')
	return `https://spdx.org/licenses/${cleaned}`
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
