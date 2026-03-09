/* eslint-disable max-depth */
import is from '@sindresorhus/is'
import { defu } from 'defu'
import { findWorkspaces } from 'find-workspaces'
import { globby } from 'globby'
import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import picomatch from 'picomatch'
import type { GetMetadataBaseOptions, MetadataContext, SourceName } from '../metadata-types'
import { log } from '../log'
import { DEFAULT_GET_METADATA_OPTIONS } from '../metadata-types'

/**
 * Context provided to each metadata source during extraction.
 * Options may be partial — `defineSource` resolves defaults internally.
 */
export type SourceContext = {
	/** Accumulated results from earlier phases. Empty for phase 1 sources. */
	metadata?: Partial<MetadataContext>
	/** Options passed to `getMetadata`. May be partial; defaults are resolved by `defineSource`. */
	options: GetMetadataBaseOptions
}

/**
 * A value that is either a single item or an array of items.
 */
export type OneOrMany<T> = T | T[]

// ─── File Matching ──────────────────────────────────────────────────

const matchCache = new Map<string, string[]>()
const workspaceCache = new Map<string, string[]>()

/**
 * Get the full recursive file tree for a directory, memoized by path + respectIgnored.
 * Returns relative POSIX paths (internal to globby; callers receive absolute paths via getMatches).
 */
async function getTree(path: string, respectIgnored: boolean): Promise<string[]> {
	const key = `${path}\0${respectIgnored ? '1' : '0'}`
	let tree = matchCache.get(key)
	if (!tree) {
		tree = await globby('**', { cwd: path, dot: true, gitignore: respectIgnored })
		matchCache.set(key, tree)
	}

	return tree
}

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

/**
 * Clear the memoized file tree cache. Call between test runs or when
 * the same path needs to be re-scanned.
 */
export function resetMatchCache(): void {
	matchCache.clear()
	workspaceCache.clear()
}

// ─── Path Formatting ────────────────────────────────────────────────

/**
 * Format an absolute path as either absolute or relative, based on the `absolute` option.
 * When relative, paths identical to `basePath` are returned as `'.'`.
 */
export function formatPath(absolutePath: string, basePath: string, absolute = DEFAULT_GET_METADATA_OPTIONS.absolute): string {
	if (absolute) return absolutePath
	const relativePath = relative(basePath, absolutePath)
	return relativePath === '' ? '.' : relativePath
}

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

// ─── Source Records ─────────────────────────────────────────────────

/**
 * Extract the first element from a `OneOrMany` value.
 */
export function firstOf<T>(value: OneOrMany<T> | undefined): T | undefined {
	if (value === undefined) return undefined
	return Array.isArray(value) ? value[0] : value
}

/**
 * A unified record returned by every metadata source.
 * @template D The shape of the primary data extracted from the source.
 * @template E The shape of any additional computed/derived fields.
 */
export type SourceRecord<
	D extends Record<string, unknown> = Record<string, unknown>,
	E extends Record<string, unknown> = Record<string, unknown>,
> = {
	/** Primary structured data from this source. */
	data: D
	/** Additional computed or derived fields not present in the raw source. */
	extra?: E
	/** The file path or URL from which the data was derived. */
	source: string
}

// ─── Source Record Extraction ────────────────────────────────────────

/**
 * Extract the concrete `SourceRecord<D, E>` from a `MetadataContext[K]` value type.
 * Unwraps `OneOrMany<SourceRecord<D, E>> | undefined` → `SourceRecord<D, E>`.
 */
type SourceRecordOf<K extends SourceName> = [MetadataContext[K]] extends [
	OneOrMany<infer R> | undefined,
]
	? R extends SourceRecord<infer D, infer E>
		? SourceRecord<D, E>
		: SourceRecord
	: SourceRecord

// ─── Source Interface ───────────────────────────────────────────────

/**
 * Interface for a metadata source module.
 * Each source populates a specific top-level key in MetadataContext.
 *
 * Sources that use `defineSource` get `getInputs` and `parseInput` wired
 * into `extract` automatically. Sources with custom extraction logic can
 * implement `extract` directly.
 */
/* eslint-disable perfectionist/sort-object-types -- ts/member-ordering requires properties before methods */
export type MetadataSource<K extends SourceName = SourceName> = {
	/** The top-level key this source populates in MetadataContext. */
	key: K
	/** The execution phase. Sources with the same phase run in parallel. Lower phases run first. */
	phase: number
	/** Discover inputs for this source. Returns file paths, URLs, or identifiers. */
	getInputs?(context: SourceContext): Promise<string[]>
	/** Parse a single input and return a single result, or undefined to skip. */
	parseInput?(input: string, context: SourceContext): Promise<SourceRecordOf<K> | undefined>
	/** Extract metadata from this source. Returns undefined if the source is not available. */
	extract(context: SourceContext): Promise<MetadataContext[K]>
}
/* eslint-enable perfectionist/sort-object-types */

// ─── Source Factory ─────────────────────────────────────────────────

type SourceConfig<K extends SourceName> = {
	getInputs: (context: SourceContext) => Promise<string[]>
	key: K
	parseInput: (input: string, context: SourceContext) => Promise<SourceRecordOf<K> | undefined>
	phase: number
}

/**
 * Define a metadata source with `getInputs` + `parseInput`.
 * Automatically wires them into an `extract` implementation that handles:
 * - Empty input check (returns undefined)
 * - Per-input try/catch with log.warn
 * - Filtering undefined results from parseInput
 * - OneOrMany wrapping (single result unwrapped, multiple as array)
 */
export function defineSource<K extends SourceName>(
	config: SourceConfig<K>,
): MetadataSource<K> & {
	getInputs: (context: SourceContext) => Promise<string[]>
	parseInput: (input: string, context: SourceContext) => Promise<SourceRecordOf<K> | undefined>
} {
	return {
		...config,
		async extract(context: SourceContext): Promise<MetadataContext[K]> {
			// Resolve defaults so getInputs/parseInput always see complete options
			const resolved: SourceContext = {
				...context,
				options: defu(context.options, DEFAULT_GET_METADATA_OPTIONS),
			}

			const inputs = await config.getInputs(resolved)
			if (inputs.length === 0) return undefined as MetadataContext[K]

			const results: SourceRecord[] = []
			for (const input of inputs) {
				try {
					const result = await config.parseInput(input, resolved)
					if (result) {
						result.source = formatPath(result.source, resolved.options.path, resolved.options.absolute)
						results.push(result)
					}
				} catch (error) {
					log.warn(
						`Failed to process "${input}": ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}

			if (results.length === 0) return undefined as MetadataContext[K]
			return (results.length === 1 ? results[0] : results) as MetadataContext[K]
		},
	}
}
