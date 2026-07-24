// ─── Header parser ──────────────────────────────────────────────────────────

const LEADING_WHITESPACE_REGEX = /^\s/v

/** Multi-value headers that can appear multiple times. */
const MULTI_VALUE_HEADERS = new Set([
	'Classifier',
	'Platform',
	'Project-URL',
	'Requires-Dist',
	'Requires-External',
	'Supported-Platform',
])

/**
 * Parse RFC 822-style headers from PKG-INFO / METADATA content. Multi-value
 * headers are collected into newline-separated strings. Stops at the first
 * blank line (which separates headers from body).
 */
export function parseRfc822Headers(content: string): Record<string, string> {
	const headers: Record<string, string> = {}
	let lastKey = ''

	for (const line of content.split('\n')) {
		// Blank line = end of headers, start of body
		if (line.trim() === '') {
			break
		}

		// Continuation line (starts with whitespace)
		if (lastKey !== '' && LEADING_WHITESPACE_REGEX.test(line)) {
			const continuation = line.trim()
			if (continuation !== '') {
				headers[lastKey] = `${headers[lastKey]}\n${continuation}`
			}

			continue
		}

		// Header line: "Key: Value"
		const colonIndex = line.indexOf(': ')
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex)
			const value = line.slice(colonIndex + 2).trim()

			const previous = headers[key]
			headers[key] =
				previous !== undefined && previous !== '' && MULTI_VALUE_HEADERS.has(key)
					? `${previous}\n${value}`
					: value

			lastKey = key
		}
	}

	return headers
}

/** Extract body text after the first blank line. */
export function extractRfc822Body(content: string): string | undefined {
	const blankIndex = content.indexOf('\n\n')
	if (blankIndex === -1) {
		return undefined
	}

	const body = content.slice(blankIndex + 2).trim()
	return body === '' ? undefined : body
}

/** Split newline-separated multi-value into array. */
export function splitMultiValues(value: string | undefined): string[] {
	if (value === undefined || value === '') {
		return []
	}

	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}
