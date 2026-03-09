import is from '@sindresorhus/is'

/**
 * TODO
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
