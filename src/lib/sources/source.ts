import is from '@sindresorhus/is'
import { findWorkspaces } from 'find-workspaces'
import { globby } from 'globby'
import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import picomatch from 'picomatch'
import type { GetMetadataBaseOptions, MetadataContext, SourceName } from '../metadata-types'
import { log } from '../log'

/**
 * Context provided to each metadata source during extraction.
 */
export type SourceContext = {
	/** Accumulated results from earlier phases. Empty for phase 1 sources. */
	metadata: Partial<MetadataContext>
	/** The resolved options passed to `getMetadata`. */
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
 * Returns relative POSIX paths.
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

/**
 * Get workspace locations for a directory, memoized by directory path.
 * Returns all found workspace location paths, relative to the directory.
 *
 * Directories to any monorepo workspaces... only supports yarn, npm, pnpm, lerna, and bolt at the moment.
 * Never includes the root path!
 * @param directory - The root directory to search from
 * @param workspaces - `false` to disable, `true` to auto-discover, `string[]` for a manual list
 */
export function getWorkspaces(directory: string, workspaces: boolean | string[] = true): string[] {
	if (workspaces === false) return []

	if (Array.isArray(workspaces)) {
		const seen = new Set<string>()
		const validated: string[] = []

		for (const workspace of workspaces) {
			if (!is.nonEmptyString(workspace)) {
				log.warn(`Skipping invalid workspace: expected non-empty string, got ${is(workspace)}`)
				continue
			}

			// Hmm...
			// if (isAbsolute(workspace)) {
			// 	log.warn(`Skipping workspace "${workspace}": must be a relative path`)
			// 	continue
			// }

			const absolute = resolve(directory, workspace)
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
			validated.push(workspace)
		}

		return validated
	}

	let locations = workspaceCache.get(directory)
	if (!locations) {
		locations =
			findWorkspaces(directory)
				?.map((value) => value.location)
				.filter((value) => value !== directory) ?? []
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

type MatchOptions = Pick<GetMetadataBaseOptions, 'path' | 'recursive' | 'respectIgnored'>

/**
 * Find files matching glob patterns in a directory's file tree.
 *
 * - Memoizes the file tree internally (keyed by path + respectIgnored)
 * - Auto-prepends `**\/` to patterns when `options.recursive` is true
 * - Always uses case-insensitive matching
 * @param options - Must include `path`; optionally `recursive` and `respectIgnored`
 * @param patterns - Root-relative glob patterns (e.g. `['package.json']`, `['*.gemspec']`)
 * @param patternsRecursive - Optionally explicitly specify recursive pattern
 * variation, otherwise  `**\/` is prepended automatically
 */
export async function getMatches(
	options: MatchOptions,
	patterns: string[],
	patternsRecursive?: string[],
): Promise<string[]> {
	const tree = await getTree(options.path, options.respectIgnored ?? true)
	const effectivePatterns = options.recursive
		? // Recursive... use explicit if available, otherwise fall back to implicit
			(patternsRecursive ?? patterns.map((p) => `**/${p}`))
		: // Non-recursive...
			patterns

	const isMatch = picomatch(effectivePatterns, { nocase: true })
	return tree.filter((filePath) => isMatch(filePath))
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
			const inputs = await config.getInputs(context)
			if (inputs.length === 0) return undefined as MetadataContext[K]

			const results: SourceRecord[] = []
			for (const input of inputs) {
				try {
					const result = await config.parseInput(input, context)
					if (result) results.push(result)
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
