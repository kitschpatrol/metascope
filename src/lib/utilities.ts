import type { BasicPersonOrOrg, CodeMetaBasic } from '@kitschpatrol/codemeta'
import is from '@sindresorhus/is'
import path from 'node:path'
import { titleCase } from 'scule'
import type { PackageData } from './metadata-types'
/**
 * TODO
 */
export function exists<T>(value: T): value is NonNullable<T> {
	if (is.nullOrUndefined(value)) return false
	if (is.emptyStringOrWhitespace(value)) return false
	if (is.emptyArray(value)) return false
	if (is.emptyMap(value)) return false
	if (is.emptySet(value)) return false
	if (is.emptyObject(value)) return false
	return true
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

declare global {
	// eslint-disable-next-line ts/consistent-type-definitions
	interface RegExpConstructor {
		escape(string_: string): string
	}
}

function ensureArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value]
}

// Codemeta is casual about capitalization...
export const REPLACEMENTS = new Map<string, string>([
	['javascript', 'JavaScript'],
	['typescript', 'TypeScript'],
])

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

// Template helpers

/**
 * TODO
 */
export function stripNamespace(value: string): string {
	return path.basename(value)
}

/**
 * Obsidian alias
 */
export function toAlias(value: string | undefined): string | undefined {
	if (is.nonEmptyString(value)) {
		return titleCase(stripNamespace(value))
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

/**
 * TODO
 */
export function basicLicense(source: string | undefined): string | undefined {
	if (source === undefined) {
		return undefined
	}

	return source.replace('http://spdx.org/licenses/', '').replace('https://spdx.org/licenses/', '')
}

/**
 * TODO
 */
export function usesSharedConfig(codemeta: CodeMetaBasic): boolean {
	return hasDependencyWithId('@kitschpatrol/shared-config', codemeta)
}

/**
 * TODO
 */
export function usesPnpm(packageJson: PackageData): boolean {
	return (
		packageJson.packageManager?.toLowerCase().startsWith('pnpm') ??
		Object.hasOwn(packageJson.engines ?? {}, 'pnpm')
	)
}

function hasDependencyWithId(id: string, codemeta: CodeMetaBasic): boolean {
	return [...(codemeta.softwareSuggestions ?? []), ...(codemeta.softwareRequirements ?? [])].some(
		({ identifier }) => identifier === id,
	)
}

/**
 * Takes a `BasicPersonOrOrg` and returns a compound string if possible
 */
function basicName(basicPersonOrOrg: BasicPersonOrOrg | undefined): string | undefined {
	if (basicPersonOrOrg === undefined) {
		return undefined
	}

	if (basicPersonOrOrg.name !== undefined) {
		return basicPersonOrOrg.name
	}

	return toDelimitedString([basicPersonOrOrg.givenName, basicPersonOrOrg.familyName], ' ')
}

/**
 * Takes a `BasicPersonOrOrg[]` and returns an array of compound strings
 */
export function basicNames(source: BasicPersonOrOrg[] | undefined): string[] | undefined {
	if (source === undefined) {
		return undefined
	}

	return source
		.map((basicPersonOrOrg) => basicName(basicPersonOrOrg))
		.filter((value) => value !== undefined)
}

/**
 * True if project was authored by specific person(s)
 */
export function isAuthoredBy(
	codemeta?: CodeMetaBasic,
	authorName?: string | string[],
): boolean | undefined {
	if (codemeta === undefined || authorName === undefined || codemeta.author === undefined) {
		return undefined
	}

	const authors = new Set(ensureArray(authorName).map((name) => name.toLocaleLowerCase().trim()))

	const basicNamesArray = basicNames(codemeta.author)?.map((name) =>
		name.toLocaleLowerCase().trim(),
	)

	return basicNamesArray?.some((name) => authors.has(name))
}
/**
 * True if project is on a specific github account(s)
 */
export function isOnGithubAccountOf(
	codemeta?: CodeMetaBasic,
	githubUserName?: string | string[],
): boolean | undefined {
	if (
		codemeta === undefined ||
		githubUserName === undefined ||
		codemeta.codeRepository === undefined
	) {
		return undefined
	}

	const cleanRepo = codemeta.codeRepository.toLocaleLowerCase().trim()

	if (!cleanRepo.includes('github.com/')) {
		return false
	}
	// Check for user name in string between / characters
	return ensureArray(githubUserName).some((userName) =>
		cleanRepo.includes(`/${userName.toLocaleLowerCase().trim()}/`),
	)
}

/**
 * Legacy status heuristic from AllWork project
 */
export function getStatus(
	codemeta?: CodeMetaBasic,
	authorName?: string | string[],
	githubUserName?: string | string[],
):
	| /** It's a fork on GitHub */
	(| 'fork'
			/** I am original author, local or on github */
			| 'source'
			/** Someone else's local code */
			| 'unmaintained'
	  )
	| undefined {
	if (codemeta === undefined || authorName === undefined || githubUserName === undefined) {
		return undefined
	}

	const isAuthoredByAuthorName = isAuthoredBy(codemeta, authorName)
	const isOnGithub = isOnGithubAccountOf(codemeta, githubUserName)

	if (isAuthoredByAuthorName === undefined || isOnGithub === undefined) {
		return undefined
	}

	return !isAuthoredByAuthorName && isOnGithub
		? 'fork'
		: isAuthoredByAuthorName
			? 'source'
			: 'unmaintained'
}
