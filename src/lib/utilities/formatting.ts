/* eslint-disable ts/no-restricted-types */
import is from '@sindresorhus/is'
import { replaceCore } from 'case-police'
import abbreviates from 'case-police/dict/abbreviates.json'
import brands from 'case-police/dict/brands.json'
import general from 'case-police/dict/general.json'
import products from 'case-police/dict/products.json'
import softwares from 'case-police/dict/softwares.json'
import path, { relative } from 'node:path'
import { titleCase } from 'scule'
import { DEFAULT_GET_METADATA_OPTIONS } from '../metadata-types'

const casePoliceDict: Record<string, string> = {
	...abbreviates,
	...brands,
	...general,
	...products,
	...softwares,
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
 * Get MB
 */
export function toMb(bytes: unknown): number | undefined {
	if (is.positiveNumber(bytes)) {
		return Math.round(bytes / 1024 / 1024)
	}
	return undefined
}

/**
 * Strip the namespace or directory prefix from a package name or path.
 */
export function stripNamespace(value: string): string {
	return path.basename(value)
}

// Codemeta is casual about capitalization...
export const REPLACEMENTS = new Map<string, string>([
	['javascript', 'JavaScript'],
	['typescript', 'TypeScript'],
])

/**
 * Obsidian alias
 */
export function toAlias(value: string | undefined): string | undefined {
	if (is.nonEmptyString(value)) {
		const result = titleCase(stripNamespace(value))
		// Case police corrections, too
		return replaceCore(result, casePoliceDict) ?? result
	}
	return undefined
}

/**
 * Escape a string for use in a regular expression.
 */
export function escapeRegExp(string_: string): string {
	return string_.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/**
 * Convert a filename or relative path to a local `file://` URL rooted at `repoPath`.
 * Correctly handles Windows paths by replacing backslashes with forward slashes.
 */
export function toLocalUrl(
	value: string | undefined,
	repoPath: string | undefined,
): string | undefined {
	if (value === undefined || repoPath === undefined) {
		return undefined
	}

	// file:// URLs must use forward slashes even on Windows
	const relativePath = path.join(repoPath, path.basename(value)).replaceAll('\\', '/')
	return `file://${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
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
 * Wrap a value in an array if it isn't one already.
 * Returns an empty array for `undefined` or `null`.
 */
export function ensureArray<T>(value: null | T | T[] | undefined): T[] {
	if (value === undefined || value === null) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Takes any value and extracts all strings from it.
 * Returns string[] if any strings were found, or undefined otherwise.
 * Optionally performs case-insensitive string replacement with `replacements`
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

// ─── Path Formatting ────────────────────────────────────────────────

/**
 * Format an absolute path as either absolute or relative, based on the `absolute` option.
 * When relative, paths identical to `basePath` are returned as `'.'`.
 * Correctly handles Windows paths (normalizes to POSIX) and ignores URLs.
 */
export function formatPath(
	absolutePath: string,
	basePath: string,
	absolute = DEFAULT_GET_METADATA_OPTIONS.absolute,
): string {
	// Don't format URLs (roughly detected by protocol prefix)
	if (/^[a-z]+:\/\//i.test(absolutePath)) return absolutePath

	if (absolute) return absolutePath.replaceAll('\\', '/')

	const relativePath = relative(basePath, absolutePath).replaceAll('\\', '/')
	return relativePath === '' ? '.' : relativePath
}

// ─── Collection Helpers ─────────────────────────────────────────────

/**
 * Process an array of items in batches to avoid resource limits.
 */
export async function batchMap<T, R>(
	items: T[],
	mapper: (item: T) => Promise<R>,
	batchSize = 50,
): Promise<R[]> {
	const results: R[] = []
	for (let index = 0; index < items.length; index += batchSize) {
		const chunk = items.slice(index, index + batchSize)
		const chunkResults = await Promise.all(chunk.map(async (item) => mapper(item)))
		results.push(...chunkResults)
	}
	return results
}

/**
 * Extract the first element from a `OneOrMany` value.
 */
export function firstOf<T>(value: T | T[] | undefined): T | undefined {
	if (value === undefined) return undefined
	return Array.isArray(value) ? value[0] : value
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
