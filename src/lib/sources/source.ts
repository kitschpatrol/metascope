import type { CodeMeta } from '@kitschpatrol/codemeta'
import type { Credentials, MetadataContext, SourceName } from '../types'

/**
 * Context provided to each metadata source during availability checks and fetching.
 */
export type SourceContext = {
	/** CodeMeta data, available after the codemeta source runs first. Used for discovery hints. */
	codemeta?: CodeMeta
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
	/** Fetch all available metadata from this source. */
	fetch(context: SourceContext): Promise<MetadataContext[K]>
	/** Check if this source can provide data for the given project. */
	isAvailable(context: SourceContext): Promise<boolean>
}
/* eslint-enable perfectionist/sort-object-types */
