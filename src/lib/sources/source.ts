import type { Credentials, MetadataContext, SourceName } from '../metadata-types'

/**
 * Context provided to each metadata source during availability checks and extraction.
 */
export type SourceContext = {
	/** API credentials for remote sources. */
	credentials: Credentials
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
	/** Extract all available metadata from this source. */
	extract(context: SourceContext): Promise<MetadataContext[K]>
	/** Check if this source can provide data for the given project. */
	isAvailable(context: SourceContext): Promise<boolean>
}
/* eslint-enable perfectionist/sort-object-types */
