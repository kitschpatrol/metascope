/**
 * Thin wrapper around `read-pkg` for consistency with other parsers.
 * Re-exports the parsed type and provides a `parsePackageJson` function
 * that accepts file content as a string.
 */

// eslint-disable-next-line depend/ban-dependencies
import type { NormalizedPackageJson } from 'read-pkg'
// eslint-disable-next-line depend/ban-dependencies
import { parsePackage } from 'read-pkg'

export type NodePackageJsonData = Partial<NormalizedPackageJson>

/**
 * Parse package.json content and return structured metadata.
 */
export function parsePackageJson(content: string): NormalizedPackageJson {
	return parsePackage(content)
}
