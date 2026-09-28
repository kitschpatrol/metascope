import is from '@sindresorhus/is'

/**
 * Check if a value is non-nullish and non-empty (handles strings, arrays, maps,
 * sets, and objects).
 */
export function exists<T>(value: T): value is NonNullable<T> {
	return (
		!is.nullOrUndefined(value) &&
		!is.emptyStringOrWhitespace(value) &&
		!is.emptyArray(value) &&
		!is.emptyMap(value) &&
		!is.emptySet(value) &&
		!is.emptyObject(value)
	)
}
