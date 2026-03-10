import type { NodePackageJsonData } from '../sources/node-package-json'
import type { CodeMetaJson, CodeMetaJsonData } from '../sources/codemeta-json'
import { ensureArray, firstOf, toDelimitedString } from './formatting'

type CodeMetaPersonOrOrg = NonNullable<CodeMetaJson['author']>[number]

/**
 * Strip the SPDX license URL prefix, returning just the license identifier.
 */
export function basicLicense(source: string | undefined): string | undefined {
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
		.map((value) => basicLicense(value))
		.filter((value) => value !== undefined)

	return result.length === 0 ? undefined : result
}

/**
 * Check if the project has `@kitschpatrol/shared-config` as a dependency.
 */
export function usesSharedConfig(codemetaRaw: CodeMetaJsonData): boolean {
	const codemeta = firstOf(codemetaRaw)
	if (!codemeta) return false
	return hasDependencyWithId('@kitschpatrol/shared-config', codemeta.data)
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

function hasDependencyWithId(id: string, codemeta: CodeMetaJson): boolean {
	return [...(codemeta.softwareSuggestions ?? []), ...(codemeta.softwareRequirements ?? [])].some(
		({ identifier }) => identifier === id,
	)
}

/**
 * Takes a `CodeMetaPersonOrOrg` and returns a compound string if possible
 */
function basicName(basicPersonOrOrg: CodeMetaPersonOrOrg | undefined): string | undefined {
	if (basicPersonOrOrg === undefined) {
		return undefined
	}

	if (basicPersonOrOrg.name !== undefined) {
		return basicPersonOrOrg.name
	}

	return toDelimitedString([basicPersonOrOrg.givenName, basicPersonOrOrg.familyName], ' ')
}

/**
 * Takes a `CodeMetaPersonOrOrg[]` and returns an array of compound strings
 */
export function basicNames(source: CodeMetaPersonOrOrg[] | undefined): string[] | undefined {
	if (source === undefined) {
		return undefined
	}

	const result = source
		.map((basicPersonOrOrg) => basicName(basicPersonOrOrg))
		.filter((value) => value !== undefined)

	return result.length > 0 ? result : undefined
}

/**
 * True if project was authored by specific person(s)
 */
export function isAuthoredBy(
	codemetaRaw?: CodeMetaJsonData,
	authorName?: string | string[],
): boolean | undefined {
	const codemeta = firstOf(codemetaRaw)
	if (codemeta === undefined || authorName === undefined || codemeta.data.author === undefined) {
		return undefined
	}

	const authors = new Set(ensureArray(authorName).map((name) => name.toLocaleLowerCase().trim()))

	const basicNamesArray = basicNames(codemeta.data.author)?.map((name) =>
		name.toLocaleLowerCase().trim(),
	)

	return basicNamesArray?.some((name) => authors.has(name))
}

/**
 * True if project is on a specific github account(s)
 */
export function isOnGithubAccountOf(
	codemetaRaw?: CodeMetaJsonData,
	githubUserName?: string | string[],
): boolean | undefined {
	const codemeta = firstOf(codemetaRaw)
	if (
		codemeta === undefined ||
		githubUserName === undefined ||
		codemeta.data.codeRepository === undefined
	) {
		return undefined
	}

	const cleanRepo = codemeta.data.codeRepository.toLocaleLowerCase().trim()

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
	codemeta?: CodeMetaJsonData,
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
