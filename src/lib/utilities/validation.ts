import is from '@sindresorhus/is'

/**
 * Check if a value is non-nullish and non-empty (handles strings, arrays, maps, sets, and objects).
 */
export function exists<T>(value: T): value is NonNullable<T> {
	if (is.nullOrUndefined(value)) return false
	if (is.emptyStringOrWhitespace(value)) return false
	if (is.emptyArray(value)) return false
	if (is.emptyMap(value)) return false
	if (is.emptySet(value)) return false
	if (is.emptyObject(value)) return false
	return true
}
