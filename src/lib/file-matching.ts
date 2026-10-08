import is from '@sindresorhus/is'
import { defu } from 'defu'
import { findWorkspaces } from 'find-workspaces'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import picomatch from 'picomatch'
import { exec } from 'tinyexec'
import { escapePath, glob } from 'tinyglobby'
import { log } from './log'

// ─── Caches ─────────────────────────────────────────────────────────

const ignoreCache = new Map<string, string[]>()
const matchCache = new Map<string, string[]>()
const workspaceCache = new Map<string, string[]>()

/**
 * Clear the memoized ignore pattern, file tree, and workspace caches. Call
 * between test runs or when the same path needs to be re-scanned.
 */
export function resetMatchCache(): void {
	ignoreCache.clear()
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

// Git's internal directory is never part of the project tree. Its object
// store alone can hold more entries than the project itself, and nothing in it
// is project metadata. Git-backed sources locate repositories via
// `getGitConfigs` instead of the tree.
const GIT_INTERNALS_IGNORE = '**/.git/**'

/**
 * Glob patterns for paths excluded from the file tree: git-ignored paths when
 * `respectIgnored` is set (falling back to a default list outside a git
 * repository), or nothing. Memoized by path + respectIgnored.
 */
async function getIgnorePatterns(path: string, respectIgnored: boolean): Promise<string[]> {
	const key = `${path}\0${respectIgnored ? '1' : '0'}`
	let ignore = ignoreCache.get(key)

	if (!ignore) {
		ignore = []

		if (respectIgnored) {
			try {
				// `-z` yields NUL-separated unquoted paths, so names with
				// non-ASCII or special characters become valid glob patterns
				const { stdout } = await exec(
					'git',
					['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
					{
						nodeOptions: { cwd: path, stdio: ['ignore', 'pipe', 'ignore'] },
						throwOnError: true,
					},
				)

				ignore = stdout
					.split('\0')
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

		ignoreCache.set(key, ignore)
	}

	return ignore
}

/**
 * Get the full recursive file tree for a directory, memoized by path +
 * respectIgnored. Returns relative POSIX paths (internal to tinyglobby; callers
 * receive absolute paths via getMatches). Git's internal `.git` directory is
 * always excluded.
 */
export async function getTree(path: string, respectIgnored: boolean): Promise<string[]> {
	const key = `${path}\0${respectIgnored ? '1' : '0'}`
	let tree = matchCache.get(key)

	if (!tree) {
		const ignore = await getIgnorePatterns(path, respectIgnored)

		// Never traverse into symlinked directories: pnpm layouts contain
		// symlink cycles (e.g. monorepo test fixtures linking back to the
		// repo root), which multiply the tree without bound
		tree = await glob('**', {
			cwd: path,
			dot: true,
			followSymbolicLinks: false,
			ignore: [...ignore, GIT_INTERNALS_IGNORE],
		})
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
 * Get workspace locations for a directory, memoized by directory path. Returns
 * all found workspace location paths as absolute paths.
 *
 * Directories to any monorepo workspaces... only supports yarn, npm, pnpm,
 * lerna, and bolt at the moment. Never includes the root path!
 *
 * @param directory - The root directory to search from
 * @param workspaces - `false` to disable, `true` to auto-discover, `string[]`
 *   for a manual list
 */
export function getWorkspaces(directory: string, workspaces: boolean | string[] = true): string[] {
	// User opts out
	if (workspaces === false) {
		return []
	}

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
 * - When `options.workspaces` is set, also matches files in workspace directories
 *   dynamically.
 *
 * @param options - Must include `path`; optionally `recursive`,
 *   `respectIgnored`, and `workspaces`
 * @param patterns - Root-relative glob patterns (e.g. `['package.json']`,
 *   `['*.gemspec']`)
 * @param patternsRecursive - Optionally explicitly specify recursive pattern
 *   variation, otherwise `**\/` is prepended automatically
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
		if (resolved.workspaces !== false) {
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

	return sortByDepth(results)
}

/**
 * Sort absolute paths by depth (shallowest first), then alphabetically.
 */
function sortByDepth(paths: string[]): string[] {
	// Pre-compute depths to avoid repeated splitting in the comparator
	const decorated = paths.map((p) => ({ depth: p.split(sep).length, path: p }))
	decorated.sort((a, b) => {
		const depthDelta = a.depth - b.depth
		return depthDelta === 0 ? a.path.localeCompare(b.path) : depthDelta
	})
	return decorated.map((d) => d.path)
}

// ─── Git Repositories ───────────────────────────────────────────────

const GIT_CONFIG_PATH = '.git/config'

/**
 * Find git repositories under a directory by locating their `.git/config`
 * files, which the file tree deliberately excludes. Returns absolute paths to
 * the config files, shallowest first.
 *
 * - Non-recursive: checks the root and each workspace directory directly, with no
 *   filesystem walk
 * - Recursive: walks the tree for nested repositories, skipping git-ignored paths
 *   like the file tree does
 */
export async function getGitConfigs(options: MatchOptions): Promise<string[]> {
	const resolved = defu(options, DEFAULT_MATCH_OPTIONS)

	if (resolved.recursive) {
		const ignore = await getIgnorePatterns(resolved.path, resolved.respectIgnored)
		const matches = await glob(`**/${GIT_CONFIG_PATH}`, {
			cwd: resolved.path,
			dot: true,
			followSymbolicLinks: false,
			ignore,
		})
		return sortByDepth(matches.map((match) => resolve(resolved.path, match)))
	}

	const directories =
		resolved.workspaces === false
			? [resolved.path]
			: [resolved.path, ...getWorkspaces(resolved.path, resolved.workspaces)]

	const results: string[] = []
	for (const directory of directories) {
		const configPath = join(directory, GIT_CONFIG_PATH)
		try {
			const configStat = await stat(configPath)
			if (configStat.isFile()) {
				results.push(configPath)
			}
		} catch {
			// Not a git repository
		}
	}

	return sortByDepth(results)
}
