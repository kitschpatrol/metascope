// ─── Header parser ──────────────────────────────────────────────────────────

/** Multi-value headers that can appear multiple times. */
export const MULTI_VALUE_HEADERS = new Set([
	'Classifier',
	'Platform',
	'Project-URL',
	'Requires-Dist',
	'Requires-External',
	'Supported-Platform',
])

/**
 * Parse RFC 822-style headers from PKG-INFO / METADATA content.
 * Multi-value headers are collected into newline-separated strings.
 * Stops at the first blank line (which separates headers from body).
 */
export function parseRfc822Headers(content: string): Record<string, string> {
	const headers: Record<string, string> = {}
	let lastKey = ''

	for (const line of content.split('\n')) {
		// Blank line = end of headers, start of body
		if (line.trim() === '') break

		// Continuation line (starts with whitespace)
		if (/^\s/.test(line) && lastKey) {
			const continuation = line.trim()
			if (continuation) {
				headers[lastKey] = `${headers[lastKey]}\n${continuation}`
			}

			continue
		}

		// Header line: "Key: Value"
		const colonIndex = line.indexOf(': ')
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex)
			const value = line.slice(colonIndex + 2).trim()

			headers[key] =
				MULTI_VALUE_HEADERS.has(key) && headers[key] ? `${headers[key]}\n${value}` : value

			lastKey = key
		}
	}

	return headers
}

/** Extract body text after the first blank line. */
export function extractRfc822Body(content: string): string | undefined {
	const blankIndex = content.indexOf('\n\n')
	if (blankIndex === -1) return undefined
	const body = content.slice(blankIndex + 2).trim()
	return body || undefined
}

/** Split newline-separated multi-value into array. */
export function splitMultiValues(value: string | undefined): string[] {
	if (!value) return []
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}
