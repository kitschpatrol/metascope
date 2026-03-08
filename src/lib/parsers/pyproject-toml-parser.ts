/**
 * Thin wrapper around `read-pyproject` for consistency with other parsers.
 * Re-exports the parsed type and provides a `parsePyprojectToml` function
 * that accepts file content as a string.
 */

import type { PyprojectData } from 'read-pyproject'
import { parsePyproject } from 'read-pyproject'

/**
 * Parse pyproject.toml content and return structured metadata.
 */
export function parsePyprojectToml(content: string): PyprojectData {
	return parsePyproject(content, {
		camelCase: true,
		unknownKeyPolicy: 'strip',
	})
}

export { type PyprojectData } from 'read-pyproject'
