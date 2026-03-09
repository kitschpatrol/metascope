import picomatch from 'picomatch'
import type { GetMetadataBaseOptions, MetadataContext, SourceName } from '../metadata-types'

/**
 * Context provided to each metadata source during extraction.
 */
export type SourceContext = {
	/** Pre-built file tree of relative POSIX paths, respecting .gitignore. */
	fileTree: string[]
	/** Accumulated results from earlier phases. Empty for phase 1 sources. */
	metadata: Partial<MetadataContext>
	/** The resolved options passed to `getMetadata`. */
	options: GetMetadataBaseOptions
	/**
	 * Directories to any monorepo workspaces... only supports yarn, npm, pnpm, lerna, and bolt at the moment
	 * Always includes at least root path if no "real" workspaces are found, and always includes root path
	 * even if technically not a workspace
	 */
	workspaces: string[]
}

/**
 * A value that is either a single item or an array of items.
 */
export type OneOrMany<T> = T | T[]

/**
 * Filter a file tree by glob patterns, returning matching relative paths.
 */
export function matchFiles(
	fileTree: string[],
	patterns: string[],
	options?: picomatch.PicomatchOptions,
): string[] {
	const isMatch = picomatch(patterns, { nocase: true, ...options })
	return fileTree.filter((filePath) => isMatch(filePath))
}

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

/**
 * Interface for a metadata source module.
 * Each source populates a specific top-level key in MetadataContext.
 */
/* eslint-disable perfectionist/sort-object-types -- ts/member-ordering requires properties before methods */
export type MetadataSource<K extends SourceName = SourceName> = {
	/** The top-level key this source populates in MetadataContext. */
	key: K
	/** The execution phase. Sources with the same phase run in parallel. Lower phases run first. */
	phase: number
	/** Extract metadata from this source. Returns undefined if the source is not available. */
	extract(context: SourceContext): Promise<MetadataContext[K]>
}
/* eslint-enable perfectionist/sort-object-types */
