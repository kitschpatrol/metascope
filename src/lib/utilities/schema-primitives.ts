/**
 * Shared Zod schema primitives for parser schemas.
 *
 * These handle common coercions:
 *   - Empty/whitespace-only strings → undefined
 *   - URL validation with empty → undefined fallback
 *   - String arrays with empty-element filtering
 */

import is from '@sindresorhus/is'
import { z } from 'zod'

/**
 * A string that treats empty or whitespace-only values as undefined.
 * Use `.optional()` on the result for optional fields.
 */
export const nonEmptyString = z.preprocess((value) => {
	if (typeof value !== 'string') return
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

/**
 * A URL string that treats empty/whitespace as undefined.
 * Does not reject invalid URLs — just ensures non-empty.
 * Use z.url() in place of this if strict URL validation is desired.
 */
export const optionalUrl = nonEmptyString.describe('A URL string')

/**
 * An array of strings, filtering out empty/whitespace-only elements.
 */
export const stringArray = z.preprocess((value) => {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}, z.array(z.string()))

/**
 * Parse a JSON string into a plain object.
 * Returns `undefined` for malformed JSON or non-object values (arrays, primitives).
 */
export function parseJsonRecord(content: string): Record<string, unknown> | undefined {
	try {
		const parsed: unknown = JSON.parse(content)
		return is.plainObject(parsed) ? parsed : undefined
	} catch {
		return undefined
	}
}
