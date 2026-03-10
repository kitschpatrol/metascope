import type { GetMetadataBaseOptions, MetadataContext, SourceName } from './metadata-types'
import { log } from './log'
import { formatPath } from './utilities/formatting'

/**
 * Context provided to each metadata source during extraction.
 * Options may be partial — `defineSource` resolves defaults internally.
 */
export type SourceContext = {
	/** Source keys that have already been extracted (regardless of whether they produced data). */
	completedSources?: ReadonlySet<SourceName>
	/** Accumulated results from earlier phases. Empty for phase 1 sources. */
	metadata?: Partial<MetadataContext>
	/** Options passed to `getMetadata`. May be partial; defaults are resolved by `defineSource`. */
	options: GetMetadataBaseOptions
}

/**
 * A value that is either a single item or an array of items.
 */
export type OneOrMany<T> = T | T[]

// ─── Source Records ─────────────────────────────────────────────────

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
 * Sources that use `defineSource` get `discover` and `parse` wired
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
	discover?(context: SourceContext): Promise<string[]>
	/** Parse a single input and return a single result, or undefined to skip. */
	parse?(input: string, context: SourceContext): Promise<SourceRecordOf<K> | undefined>
	/** Extract metadata from this source. Returns undefined if the source is not available. */
	extract(context: SourceContext): Promise<MetadataContext[K]>
}
/* eslint-enable perfectionist/sort-object-types */

// ─── Source Factory ─────────────────────────────────────────────────

type SourceConfig<K extends SourceName> = {
	/**
	 * Finds and returns one or more file paths, URLs, or other input values that
	 * will be passed one-by-one to parse.
	 */
	discover: (context: SourceContext) => Promise<string[]>
	/**
	 * The key used on the aggregated metadata object.
	 */
	key: K
	/**
	 * Takes one of the string values from `discover` and returns _one_ of the
	 * source's metadata objects, which are later joined into an array defining
	 * the final metadata object if more than one inputs are discovered.
	 */
	parse: (input: string, context: SourceContext) => Promise<SourceRecordOf<K> | undefined>
	/**
	 * Execution group... if `discover` or `parse` benefit from other source's
	 * metadata, they can run later in the phase for access to these accumulated
	 * values in the `context.metadata` argument.
	 */
	phase: number
}

/**
 * Define a metadata source with `discover` + `parse`.
 * Automatically wires them into an `extract` implementation that handles:
 * - Empty input check (returns undefined)
 * - Per-input try/catch with log.warn
 * - Filtering undefined results from parse
 * - OneOrMany wrapping (single result unwrapped, multiple as array)
 */
export function defineSource<K extends SourceName>(
	config: SourceConfig<K>,
): MetadataSource<K> & {
	discover: (context: SourceContext) => Promise<string[]>
	parse: (input: string, context: SourceContext) => Promise<SourceRecordOf<K> | undefined>
} {
	return {
		...config,
		async extract(context: SourceContext): Promise<MetadataContext[K]> {
			const inputs = await config.discover(context)
			if (inputs.length === 0) return undefined as MetadataContext[K]

			// Running this concurrently with Promise.all was actually slower
			const results: SourceRecord[] = []
			for (const input of inputs) {
				try {
					const result = await config.parse(input, context)
					if (result) {
						result.source = formatPath(
							result.source,
							context.options.path,
							context.options.absolute,
						)
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
