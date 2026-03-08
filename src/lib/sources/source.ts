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
