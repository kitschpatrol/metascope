import is from '@sindresorhus/is'
import { replaceCore } from 'case-police'
import abbreviates from 'case-police/dict/abbreviates.json'
import brands from 'case-police/dict/brands.json'
import general from 'case-police/dict/general.json'
import products from 'case-police/dict/products.json'
import softwares from 'case-police/dict/softwares.json'
import path from 'node:path'
import { titleCase } from 'scule'

declare global {
	// eslint-disable-next-line ts/consistent-type-definitions
	interface RegExpConstructor {
		escape(string_: string): string
	}
}

const casePoliceDict: Record<string, string> = {
	...abbreviates,
	...brands,
	...general,
	...products,
	...softwares,
}

/**
 * TODO
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
 * TODO
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
 * TODO
 */
export function toLocalUrl(
	value: string | undefined,
	repoPath: string | undefined,
): string | undefined {
	if (value === undefined || repoPath === undefined) {
		return undefined
	}

	return `file://${path.join(repoPath, path.basename(value))}`
}

/**
 * TODO
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

function ensureArray<T>(value: T | T[]): T[] {
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
				const pattern = new RegExp(RegExp.escape(search), 'gi')
				result = result.replace(pattern, replace)
			}
			return result
		})

	return filtered.length > 0 ? filtered : undefined
}

/**
 * Recursively removes `undefined` values and empty objects from an object.
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
		return filtered as T
	}

	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {}
		let hasKeys = false
		for (const [key, theValue] of Object.entries(value)) {
			if (theValue !== undefined) {
				// eslint-disable-next-line ts/no-unsafe-assignment
				const stripped = stripUndefined(theValue)
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
