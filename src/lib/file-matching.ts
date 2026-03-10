import is from '@sindresorhus/is'
import { defu } from 'defu'
import { findWorkspaces } from 'find-workspaces'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import picomatch from 'picomatch'
import { exec } from 'tinyexec'
import { escapePath, glob } from 'tinyglobby'
import { log } from './log'

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

// Default ignore patterns for non-git environments or when git fails
const DEFAULT_IGNORE = [
	'**/node_modules/**',
	'**/dist/**',
	'**/build/**',
	'**/coverage/**',
	'**/.DS_Store',
]

/**
 * Get the full recursive file tree for a directory, memoized by path + respectIgnored.
 * Returns relative POSIX paths (internal to tinyglobby; callers receive absolute paths via getMatches).
 */
export async function getTree(path: string, respectIgnored: boolean): Promise<string[]> {
	const key = `${path}\0${respectIgnored ? '1' : '0'}`
	let tree = matchCache.get(key)

	if (!tree) {
		let ignore: string[] = []

		if (respectIgnored) {
			try {
				const { stdout } = await exec(
					'git',
					['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'],
					{ nodeOptions: { cwd: path, stdio: ['ignore', 'pipe', 'ignore'] } },
				)

				ignore = stdout
					.split('\n')
					.filter(Boolean)
					.map((p) => {
						const escaped = escapePath(p)
						// Directory paths from git (trailing /) must become glob patterns
						// so tinyglobby skips them during traversal instead of walking into them
						return escaped.endsWith('/') ? `${escaped}**` : escaped
					})
			} catch {
				// Fallback to default ignore list if the command fails (e.g., not a git repository)
				ignore = [...DEFAULT_IGNORE]
			}
		}

		tree = await glob('**', { cwd: path, dot: true, ignore })
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
				? (findWorkspaces(directory, { stopDir: dirname(directory) })?.map(
						(value) => value.location,
					) ?? [])
				: workspaces,
		)
		workspaceCache.set(directory, locations)
	}

	return locations
}

// ─── File Matching ──────────────────────────────────────────────────

type MatchOptions = {
	path: string
	recursive?: boolean
	respectIgnored?: boolean
	workspaces?: boolean | string[]
}

const DEFAULT_MATCH_OPTIONS: Required<Omit<MatchOptions, 'path'>> & { path: string } = {
	path: '.',
	recursive: false,
	respectIgnored: true,
	workspaces: true,
}

/**
 * Find files matching glob patterns in a directory's file tree.
 *
 * - Memoizes the file tree internally (keyed by path + respectIgnored)
 * - Auto-prepends `**\/` to patterns when `options.recursive` is true
 * - Always uses case-insensitive matching
 * - When `options.workspaces` is set, also matches files in workspace directories dynamically.
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
	const resolved = defu(options, DEFAULT_MATCH_OPTIONS)
	const tree = await getTree(resolved.path, resolved.respectIgnored)

	let effectivePatterns: string[]

	if (resolved.recursive) {
		// Recursive: `**/pattern` covers the root and all workspaces automatically.
		effectivePatterns = patternsRecursive ?? patterns.map((p) => `**/${p}`)
	} else {
		// Non-recursive: Start with the root patterns...
		effectivePatterns = [...patterns]

		// ...and if workspaces are enabled, append patterns for the root of each workspace.
		if (resolved.workspaces) {
			const workspacePaths = getWorkspaces(resolved.path, resolved.workspaces)
			for (const workspace of workspacePaths) {
				// Convert absolute workspace path to a root-relative POSIX path for picomatch
				const relativeWorkspace = relative(resolved.path, workspace).replaceAll('\\', '/')
				effectivePatterns.push(...patterns.map((p) => `${relativeWorkspace}/${p}`))
			}
		}
	}

	const isMatch = picomatch(effectivePatterns, { nocase: true })
	const results: string[] = []

	// Iterate over the single, fully-cached master tree
	for (const filePath of tree) {
		if (isMatch(filePath)) {
			results.push(resolve(resolved.path, filePath))
		}
	}

	// Sort by depth (shallowest first), then alphabetically
	return results.toSorted((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
}
