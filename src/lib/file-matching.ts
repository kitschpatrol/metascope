/* eslint-disable max-depth */
import is from '@sindresorhus/is'
import { defu } from 'defu'
import { findWorkspaces } from 'find-workspaces'
import { globby } from 'globby'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import picomatch from 'picomatch'
import type { GetMetadataBaseOptions } from './metadata-types'
import { log } from './log'
import { DEFAULT_GET_METADATA_OPTIONS } from './metadata-types'

// ─── Caches ─────────────────────────────────────────────────────────

const matchCache = new Map<string, string[]>()
const workspaceCache = new Map<string, string[]>()

/**
 * Clear the memoized file tree and workspace caches. Call between test runs
 * or when the same path needs to be re-scanned.
 */
export function resetMatchCache(): void {
	matchCache.clear()
	workspaceCache.clear()
}

// ─── File Tree ──────────────────────────────────────────────────────

/**
 * Get the full recursive file tree for a directory, memoized by path + respectIgnored.
 * Returns relative POSIX paths (internal to globby; callers receive absolute paths via getMatches).
 */
export async function getTree(path: string, respectIgnored: boolean): Promise<string[]> {
	const key = `${path}\0${respectIgnored ? '1' : '0'}`
	let tree = matchCache.get(key)
	if (!tree) {
		tree = await globby('**', { cwd: path, dot: true, gitignore: respectIgnored })
		matchCache.set(key, tree)
	}

	return tree
}

// ─── Workspaces ─────────────────────────────────────────────────────

function validateWorkspaces(directory: string, workspaces: unknown[]): string[] {
	const seen = new Set<string>()
	const validated: string[] = []

	for (const workspace of workspaces) {
		if (!is.nonEmptyString(workspace)) {
			log.warn(`Skipping invalid workspace: expected non-empty string, got ${is(workspace)}`)
			continue
		}

		const absolute = resolve(directory, workspace)
		if (absolute === directory) {
			continue
		}

		if (!absolute.startsWith(directory)) {
			log.warn(`Skipping workspace "${workspace}": must be a child of "${directory}"`)
			continue
		}

		if (!existsSync(absolute)) {
			log.warn(`Skipping workspace "${workspace}": path does not exist`)
			continue
		}

		if (seen.has(absolute)) {
			log.warn(`Skipping workspace "${workspace}": duplicate entry`)
			continue
		}

		seen.add(absolute)
		validated.push(absolute)
	}

	return validated
}

/**
 * Get workspace locations for a directory, memoized by directory path.
 * Returns all found workspace location paths as absolute paths.
 *
 * Directories to any monorepo workspaces... only supports yarn, npm, pnpm, lerna, and bolt at the moment.
 * Never includes the root path!
 * @param directory - The root directory to search from
 * @param workspaces - `false` to disable, `true` to auto-discover, `string[]` for a manual list
 */
export function getWorkspaces(directory: string, workspaces: boolean | string[] = true): string[] {
	// User opts out
	if (workspaces === false) return []

	let locations = workspaceCache.get(directory)
	if (!locations) {
		locations = validateWorkspaces(
			directory,
			workspaces === true
				? (findWorkspaces(directory)?.map((value) => value.location) ?? [])
				: workspaces,
		)
		workspaceCache.set(directory, locations)
	}

	return locations
}

// ─── File Matching ──────────────────────────────────────────────────

type MatchOptions = Pick<
	GetMetadataBaseOptions,
	'path' | 'recursive' | 'respectIgnored' | 'workspaces'
>

/**
 * Find files matching glob patterns in a directory's file tree.
 *
 * - Memoizes the file tree internally (keyed by path + respectIgnored)
 * - Auto-prepends `**\/` to patterns when `options.recursive` is true
 * - Always uses case-insensitive matching
 * - When `options.workspaces` is set, also matches files in workspace directories.
 *   Workspace matches are returned as absolute paths. Workspace trees are individually memoized.
 * @param options - Must include `path`; optionally `recursive`, `respectIgnored`, and `workspaces`
 * @param patterns - Root-relative glob patterns (e.g. `['package.json']`, `['*.gemspec']`)
 * @param patternsRecursive - Optionally explicitly specify recursive pattern
 * variation, otherwise  `**\/` is prepended automatically
 */
export async function getMatches(
	options: MatchOptions,
	patterns: string[],
	patternsRecursive?: string[],
): Promise<string[]> {
	const resolved = defu(options, DEFAULT_GET_METADATA_OPTIONS)
	const tree = await getTree(resolved.path, resolved.respectIgnored)
	const effectivePatterns = resolved.recursive
		? // Recursive... use explicit if available, otherwise fall back to implicit
			(patternsRecursive ?? patterns.map((p) => `**/${p}`))
		: // Non-recursive...
			patterns

	const isMatch = picomatch(effectivePatterns, { nocase: true })
	const seen = new Set<string>()
	const results: string[] = []

	for (const filePath of tree) {
		const absolutePath = resolve(resolved.path, filePath)
		if (isMatch(filePath) && !seen.has(absolutePath)) {
			seen.add(absolutePath)
			results.push(absolutePath)
		}
	}

	// Also match in workspace directories
	if (resolved.workspaces) {
		const workspacePaths = getWorkspaces(resolved.path, resolved.workspaces)
		for (const workspace of workspacePaths) {
			const workspaceTree = await getTree(workspace, resolved.respectIgnored)
			for (const filePath of workspaceTree) {
				if (isMatch(filePath)) {
					const absolutePath = resolve(workspace, filePath)
					if (!seen.has(absolutePath)) {
						seen.add(absolutePath)
						results.push(absolutePath)
					}
				}
			}
		}
	}

	// Sort alphabetically first, then by depth (shallowest first)
	return results.toSorted((a, b) => a.localeCompare(b) || a.split('/').length - b.split('/').length)
}
