/* eslint-disable ts/no-unsafe-assignment */
/* eslint-disable ts/no-unsafe-type-assertion */
/* eslint-disable ts/no-unsafe-return */

/**
 * Recursively removes `undefined` values and empty objects from an object.
 * Array elements that are `undefined` are also removed.
 * Returns `undefined` if the entire input becomes empty after stripping.
 */
export function stripUndefined<T>(value: T): T {
	if (Array.isArray(value)) {
		const filtered = value
			.filter((item) => item !== undefined)
			.map((item) => stripUndefined(item))
			.filter((item) => item !== undefined)
		return filtered as T
	}

	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {}
		let hasKeys = false
		for (const [key, theValue] of Object.entries(value)) {
			if (theValue !== undefined) {
				const stripped = stripUndefined(theValue)
				if (stripped !== undefined) {
					result[key] = stripped
					hasKeys = true
				}
			}
		}

		if (!hasKeys) return undefined as T

		return result as T
	}

	return value
}
