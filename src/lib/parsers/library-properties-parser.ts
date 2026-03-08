/**
 * Parser for `library.properties` files (key=value format).
 *
 * Used by both Arduino and Processing IDE library managers. These are
 * flat UTF-8 properties files with no sections or nesting. Comment lines
 * start with `#`. Only the first `=` on each line is the delimiter.
 *
 * Returns raw key-value pairs — all domain-specific validation and
 * transformation is handled by the consuming source.
 */

/**
 * Parse a `library.properties` content string into raw key-value pairs.
 */
export function parseLibraryProperties(content: string): Record<string, string> {
	const raw: Record<string, string> = {}

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim()
		if (line.length === 0 || line.startsWith('#')) continue

		const eqIndex = line.indexOf('=')
		if (eqIndex === -1) continue

		const key = line.slice(0, eqIndex).trim()
		const value = line.slice(eqIndex + 1).trim()
		if (key.length > 0) raw[key] = value
	}

	return raw
}
