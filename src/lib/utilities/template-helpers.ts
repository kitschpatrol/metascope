/* eslint-disable ts/no-restricted-types */
import is from '@sindresorhus/is'
import { replaceCore } from 'case-police'
import abbreviates from 'case-police/dict/abbreviates.json'
import brands from 'case-police/dict/brands.json'
import general from 'case-police/dict/general.json'
import products from 'case-police/dict/products.json'
import softwares from 'case-police/dict/softwares.json'
import path from 'node:path'
import { titleCase } from 'scule'
import type { CodeMetaJson } from '../sources/codemeta-json'
import type { NodePackageJsonData } from '../sources/node-package-json'

const casePoliceDict: Record<string, string> = {
	...abbreviates,
	...brands,
	...general,
	...products,
	...softwares,
}

// ─── OneOrMany Helpers ──────────────────────────────────────────────

/**
 * Extract the first element from a `OneOrMany` value.
 *
 * Metadata sources may return a single record or an array of records. This
 * helper normalizes access so you can safely retrieve the first record
 * regardless of cardinality.
 */
export function firstOf<T>(value: T | T[] | undefined): T | undefined {
	if (value === undefined) return undefined
	return Array.isArray(value) ? value[0] : value
}

/**
 * Wrap a value in an array if it isn't one already.
 * Returns an empty array for `undefined` or `null`.
 */
export function ensureArray<T>(value: null | T | T[] | undefined): T[] {
	if (value === undefined || value === null) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Collect values from all records in a `OneOrMany<SourceRecord<D>>` source.
 * Runs the accessor on each record's `.data` and returns all non-undefined results.
 *
 * Useful for extracting a specific field from sources that may contain multiple records
 * (e.g. multiple Cargo.toml files in a workspace).
 */
export function collectField<T extends { data: unknown }, R>(
	source: T | T[] | undefined,
	accessor: (data: T['data']) => R | undefined,
): R[] {
	if (source === undefined) return []
	const records = Array.isArray(source) ? source : [source]
	return records
		.map((record) => accessor(record.data))
		.filter((value): value is R => value !== undefined)
}

/**
 * Collect and flatten array values from all records in a `OneOrMany<SourceRecord<D>>` source.
 * Runs the accessor on each record's `.data` and flattens the resulting arrays.
 */
export function collectArrayField<T extends { data: unknown }, R>(
	source: T | T[] | undefined,
	accessor: (data: T['data']) => R[] | undefined,
): R[] {
	if (source === undefined) return []
	const records = Array.isArray(source) ? source : [source]
	return records.flatMap((record) => accessor(record.data) ?? [])
}

/**
 * Return the array if non-empty, otherwise undefined.
 * Useful for converting empty collection results to undefined before `stripUndefined`.
 */
export function nonEmpty<T>(array: T[]): T[] | undefined {
	return array.length > 0 ? array : undefined
}

// ─── String Helpers ─────────────────────────────────────────────────

/**
 * Split a string on commas, trimming each part and filtering out empty strings.
 * Returns an empty array for `undefined` or empty input.
 */
export function splitCommaSeparated(value: string | undefined): string[] {
	if (value === undefined) return []
	return value
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

/**
 * Join an array of strings with a delimiter, filtering out undefined values.
 */
export function toDelimitedString(
	source: Array<string | undefined> | string | string[] | undefined,
	delimiter = ', ',
): string | undefined {
	if (source === undefined) return undefined
	if (Array.isArray(source)) {
		const filtered = source.filter((s): s is string => s !== undefined)
		return filtered.length > 0 ? filtered.join(delimiter) : undefined
	}
	return source
}

/**
 * Convert a URL or path to a markdown link using its basename as the label.
 */
export function toMarkdownLink(value: string | undefined): string | undefined {
	if (is.nonEmptyStringAndNotWhitespace(value)) {
		return `[${path.basename(value)}](${value})`
	}
}

/**
 * Convert bytes to megabytes (rounded).
 * (MB, not MiB.)
 */
export function toMb(bytes: unknown): number | undefined {
	if (is.positiveNumber(bytes)) {
		return Math.round((bytes / 1000 / 1000) * 100) / 100
	}
	return undefined
}

/**
 * Strip the namespace or directory prefix from a package name or path.
 */
export function stripNamespace(value: string): string {
	return path.basename(value)
}

/**
 * Convert a package name to a human-friendly alias using title case
 * and brand-name corrections.
 */
export function toAlias(value: string | undefined): string | undefined {
	if (is.nonEmptyString(value)) {
		const result = titleCase(stripNamespace(value))
		return replaceCore(result, casePoliceDict) ?? result
	}
	return undefined
}

/**
 * Escape a string for use in a regular expression.
 */
function escapeRegExp(string_: string): string {
	return string_.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

// Codemeta is casual about capitalization...
export const REPLACEMENTS = new Map<string, string>([
	['javascript', 'JavaScript'],
	['typescript', 'TypeScript'],
])

/**
 * Takes any value and extracts all strings from it.
 * Returns string[] if any strings were found, or undefined otherwise.
 * Optionally performs case-insensitive string replacement with `replacements`.
 */
export function mixedStringsToArray(
	value: unknown,
	replacements?: Map<string, string>,
): string[] | undefined {
	if (value === undefined) {
		return undefined
	}

	const array = ensureArray(value)
	const filtered = array
		.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
		.map((item) => {
			if (!replacements) return item
			let result = item
			for (const [search, replace] of replacements) {
				const pattern = new RegExp(escapeRegExp(search), 'gi')
				result = result.replace(pattern, replace)
			}
			return result
		})

	return filtered.length > 0 ? filtered : undefined
}

/**
 * Convert a filename or relative path to a local `file://` URL rooted at `repoPath`.
 */
export function toLocalUrl(
	value: string | undefined,
	repoPath: string | undefined,
): string | undefined {
	if (value === undefined || repoPath === undefined) {
		return undefined
	}

	const relativePath = path.join(repoPath, path.basename(value)).replaceAll('\\', '/')
	return `file://${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
}

// ─── Object Helpers ─────────────────────────────────────────────────

/**
 * Recursively removes `undefined` values and empty objects from an object.
 * Only recurses into plain objects and arrays. Non-plain objects (like Date)
 * are preserved as-is.
 * Array elements that are `undefined` are also removed.
 * Returns `undefined` if the entire input becomes empty after stripping.
 */
export function stripUndefined<T>(value: T): T {
	if (Array.isArray(value)) {
		const filtered = value
			.filter((item) => item !== undefined)
			// eslint-disable-next-line ts/no-unsafe-return
			.map((item) => stripUndefined(item))
			.filter((item) => item !== undefined)
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		return (filtered.length > 0 ? filtered : undefined) as T
	}

	if (is.plainObject(value)) {
		const result: Record<string, unknown> = {}
		let hasKeys = false
		for (const [key, theValue] of Object.entries(value)) {
			if (theValue !== undefined) {
				const stripped = stripUndefined(theValue)
				// eslint-disable-next-line ts/no-unnecessary-condition
				if (stripped !== undefined) {
					result[key] = stripped
					hasKeys = true
				}
			}
		}

		// eslint-disable-next-line ts/no-unsafe-type-assertion
		if (!hasKeys) return undefined as T

		// eslint-disable-next-line ts/no-unsafe-type-assertion
		return result as T
	}

	return value
}

// ─── License Helpers ────────────────────────────────────────────────

/**
 * Strip the SPDX license URL prefix, returning just the license identifier.
 */
export function toBasicLicense(source: string | undefined): string | undefined {
	if (source === undefined) {
		return undefined
	}

	return source.replace('http://spdx.org/licenses/', '').replace('https://spdx.org/licenses/', '')
}

/**
 * Normalize one or more license values to plain SPDX identifiers, stripping URL prefixes.
 */
export function toBasicLicenses(
	...sources: Array<string | string[] | undefined>
): string[] | undefined {
	const result = sources
		.flat()
		.filter((value): value is string => value !== undefined)
		.map((value) => toBasicLicense(value))
		.filter((value) => value !== undefined)

	return result.length === 0 ? undefined : result
}

// ─── CodeMeta Helpers ───────────────────────────────────────────────

type CodeMetaPersonOrOrg = NonNullable<CodeMetaJson['author']>[number]

/**
 * Extract a display name from a `CodeMetaPersonOrOrg`.
 */
function toBasicName(basicPersonOrOrg: CodeMetaPersonOrOrg | undefined): string | undefined {
	if (basicPersonOrOrg === undefined) {
		return undefined
	}

	if (basicPersonOrOrg.name !== undefined) {
		return basicPersonOrOrg.name
	}

	return toDelimitedString([basicPersonOrOrg.givenName, basicPersonOrOrg.familyName], ' ')
}

/**
 * Extract display names from an array of `CodeMetaPersonOrOrg`.
 */
export function toBasicNames(source: CodeMetaPersonOrOrg[] | undefined): string[] | undefined {
	if (source === undefined) {
		return undefined
	}

	const result = source
		.map((basicPersonOrOrg) => toBasicName(basicPersonOrOrg))
		.filter((value) => value !== undefined)

	return result.length > 0 ? result : undefined
}

// ─── Query Helpers ──────────────────────────────────────────────────

/**
 * Check id a project uses a specific dependency
 */
export function hasDependencyWithId(id: string, codemeta: CodeMetaJson): boolean {
	return [...(codemeta.softwareSuggestions ?? []), ...(codemeta.softwareRequirements ?? [])].some(
		({ identifier, name }) => identifier === id || name === id,
	)
}

/**
 * Simple list of all dependencies
 */
export function dependencyNames(
	codemeta: CodeMetaJson,
	filter: 'all' | 'dev' | 'prod' = 'all',
): string[] | undefined {
	return nonEmpty(
		[
			...new Set(
				[
					...(filter === 'prod' ? [] : (codemeta.softwareSuggestions ?? [])),
					...(filter === 'dev' ? [] : (codemeta.softwareRequirements ?? [])),
				]
					.map((value) => value.name ?? value.identifier ?? undefined)
					.filter((value) => value !== undefined),
			),
		].toSorted(),
	)
}

/**
 * Check if the project uses pnpm as its package manager.
 */
export function usesPnpm(packageJson: NodePackageJsonData): boolean {
	const first = firstOf(packageJson)
	if (!first) return false
	return (
		first.data.packageManager?.toLowerCase().startsWith('pnpm') ??
		Object.hasOwn(first.data.engines ?? {}, 'pnpm')
	)
}

/**
 * True if project was authored by specific person(s).
 */
export function isAuthoredBy(
	codemetaAuthorName?: CodeMetaPersonOrOrg | CodeMetaPersonOrOrg[],
	expectedAuthorName?: string | string[],
): boolean | undefined {
	if (
		codemetaAuthorName === undefined ||
		expectedAuthorName === undefined ||
		is.emptyArray(codemetaAuthorName) ||
		is.emptyArray(expectedAuthorName)
	) {
		return undefined
	}

	const authors = new Set(
		ensureArray(expectedAuthorName).map((name) => name.toLocaleLowerCase().trim()),
	)

	const basicNamesArray = toBasicNames(ensureArray(codemetaAuthorName))?.map((name) =>
		name.toLocaleLowerCase().trim(),
	)

	return basicNamesArray?.some((name) => authors.has(name))
}

/**
 * True if project is on a specific GitHub account(s).
 */
export function isOnGithubAccountOf(
	codeRepository?: string,
	githubUserName?: string | string[],
): boolean | undefined {
	if (codeRepository === undefined || githubUserName === undefined) {
		return undefined
	}

	const cleanRepo = codeRepository.toLocaleLowerCase().trim()

	if (!cleanRepo.includes('github.com/')) {
		return false
	}

	return ensureArray(githubUserName).some((userName) =>
		cleanRepo.includes(`/${userName.toLocaleLowerCase().trim()}/`),
	)
}

/**
 * Heuristic project status based on authorship and GitHub account.
 */
export function toStatus(
	codeRepository?: string,
	codemetaAuthorName?: CodeMetaPersonOrOrg | CodeMetaPersonOrOrg[],
	authorName?: string | string[],
	githubUserName?: string | string[],
):
	| (
			| /** It's my fork on GitHub */
			'fork'
			/** I am original author, local or on github */
			| 'source'
			/** Someone else's local code */
			| 'unmaintained'
	  )
	| undefined {
	const isAuthoredByAuthorName = isAuthoredBy(codemetaAuthorName, authorName)
	const isOnGithub = isOnGithubAccountOf(codeRepository, githubUserName)

	return !isAuthoredByAuthorName && isOnGithub
		? 'fork'
		: isAuthoredByAuthorName
			? 'source'
			: 'unmaintained'
}

/**
 * True if valid url
 */
export function isValidUrl(value: string): boolean {
	return is.urlString(value)
}
