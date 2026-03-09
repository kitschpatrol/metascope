import type { Credentials, MetadataContext, SourceName } from '../metadata-types'

/**
 * Context provided to each metadata source during availability checks and extraction.
 */
export type SourceContext = {
	/** Accumulated results from earlier phases. Empty for phase 1 sources. */
	context: Partial<MetadataContext>
	/** API credentials for remote sources. */
	credentials: Credentials
	/** When true, sources should skip network requests and return only locally-available data. */
	offline: boolean
	/** Absolute path to the project directory. */
	path: string
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
