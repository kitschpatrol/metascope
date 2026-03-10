/**
 * Helpers for building codemeta JSON-LD objects.
 *
 * Provides type-safe constructors for Person/Organization and SoftwareApplication
 * dependency nodes, plus deduplication and license URL normalization.
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
export type CodemetaPersonLd = {
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
 * Build a codemeta JSON-LD Person or Organization from flexible inputs.
 * Returns undefined if no identifying information (name, givenName+familyName, or email) is present.
 *
 * Works with person shapes from any metascope source — the caller maps
 * source-specific field names into this common parameter object.
 */
export function toPersonLd(options: {
	affiliation?: string
	email?: string
	familyName?: string
	givenName?: string
	id?: string
	name?: string
	type?: 'Organization' | 'Person'
	url?: string
}): CodemetaPersonLd | undefined {
	const hasName = is.nonEmptyStringAndNotWhitespace(options.name)
	const hasGivenName = is.nonEmptyStringAndNotWhitespace(options.givenName)
	const hasFamilyName = is.nonEmptyStringAndNotWhitespace(options.familyName)
	const hasEmail = is.nonEmptyStringAndNotWhitespace(options.email)

	if (!hasName && !hasGivenName && !hasFamilyName && !hasEmail) return undefined

	const person: CodemetaPersonLd = { '@type': options.type ?? 'Person' }
	if (is.nonEmptyStringAndNotWhitespace(options.id)) person['@id'] = options.id
	if (hasName) person.name = options.name
	if (hasGivenName) person.givenName = options.givenName
	if (hasFamilyName) person.familyName = options.familyName
	if (hasEmail) person.email = options.email
	if (is.nonEmptyStringAndNotWhitespace(options.url)) person.url = options.url
	if (is.nonEmptyStringAndNotWhitespace(options.affiliation)) {
		person.affiliation = { '@type': 'Organization', name: options.affiliation }
	}

	return person
}

/**
 * Deduplicate persons by name (case-insensitive, trimmed).
 * Keeps the first occurrence, so callers should place higher-priority sources first.
 * Returns undefined if the result is empty.
 */
export function deduplicatePersons(
	persons: CodemetaPersonLd[],
): CodemetaPersonLd[] | undefined {
	const seen = new Map<string, CodemetaPersonLd>()
	for (const person of persons) {
		const key = (
			person.name ??
			([person.givenName, person.familyName].filter(Boolean).join(' ') || undefined) ??
			person.email ??
			''
		).toLowerCase().trim()
		if (key.length > 0 && !seen.has(key)) {
			seen.set(key, person)
		}
	}

	const result = [...seen.values()]
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
	const dep: CodemetaDependencyLd = { '@type': 'SoftwareApplication', name }
	if (is.nonEmptyStringAndNotWhitespace(version)) dep.version = version
	if (is.nonEmptyStringAndNotWhitespace(identifier)) dep.identifier = identifier
	if (is.nonEmptyStringAndNotWhitespace(runtimePlatform)) {
		dep.runtimePlatform = runtimePlatform
	}

	return dep
}

/**
 * Deduplicate dependencies by name (case-insensitive).
 * Keeps the first occurrence. Returns undefined if the result is empty.
 */
export function deduplicateDependencies(
	deps: CodemetaDependencyLd[],
): CodemetaDependencyLd[] | undefined {
	const seen = new Map<string, CodemetaDependencyLd>()
	for (const dep of deps) {
		const key = dep.name.toLowerCase().trim()
		if (!seen.has(key)) {
			seen.set(key, dep)
		}
	}

	const result = [...seen.values()]
	return result.length > 0 ? result : undefined
}

// ─── License ────────────────────────────────────────────────────────

/**
 * Normalize a license identifier to an SPDX URL.
 * Handles bare SPDX IDs ("MIT") and existing SPDX URLs.
 */
export function toSpdxLicenseUrl(spdxId: string): string {
	const cleaned = spdxId
		.replace('https://spdx.org/licenses/', '')
		.replace('http://spdx.org/licenses/', '')
	return `https://spdx.org/licenses/${cleaned}`
}
