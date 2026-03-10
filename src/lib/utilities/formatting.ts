import { relative } from 'node:path'
import { DEFAULT_GET_METADATA_OPTIONS } from '../metadata-types'

// ─── Path Formatting ────────────────────────────────────────────────

/**
 * Format an absolute path as either absolute or relative, based on the `absolute` option.
 * When relative, paths identical to `basePath` are returned as `'.'`.
 * Correctly handles Windows paths (normalizes to POSIX) and ignores URLs.
 */
export function formatPath(
	absolutePath: string,
	basePath: string,
	absolute = DEFAULT_GET_METADATA_OPTIONS.absolute,
): string {
	// Don't format URLs (roughly detected by protocol prefix)
	if (/^[a-z]+:\/\//i.test(absolutePath)) return absolutePath

	if (absolute) return absolutePath.replaceAll('\\', '/')

	const relativePath = relative(basePath, absolutePath).replaceAll('\\', '/')
	return relativePath === '' ? '.' : relativePath
}

// ─── Collection Helpers ─────────────────────────────────────────────

/**
 * Process an array of items in batches to avoid resource limits.
 */
export async function batchMap<T, R>(
	items: T[],
	mapper: (item: T) => Promise<R>,
	batchSize = 50,
): Promise<R[]> {
	const results: R[] = []
	for (let index = 0; index < items.length; index += batchSize) {
		const chunk = items.slice(index, index + batchSize)
		const chunkResults = await Promise.all(chunk.map(async (item) => mapper(item)))
		results.push(...chunkResults)
	}
	return results
}
