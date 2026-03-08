/**
 * Parse a ConfigParser-style INI file into sections with key-value pairs.
 * Handles Python ConfigParser conventions: multi-line values via indented
 * continuation lines, `#` and `;` comments.
 */
export function parseConfigparser(content: string): Record<string, Record<string, string>> {
	const sections: Record<string, Record<string, string>> = {}
	let currentSection = ''
	let lastKey = ''

	for (const line of content.split('\n')) {
		const trimmed = line.trimEnd()

		// Skip empty lines and comments
		if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) {
			continue
		}

		// Section header
		const sectionMatch = /^\[([^\]]+)\]/.exec(trimmed)
		if (sectionMatch) {
			currentSection = sectionMatch[1]
			sections[currentSection] ??= {}
			lastKey = ''
			continue
		}

		// Continuation line (starts with whitespace and we have a current key)
		if (/^\s/.test(line) && lastKey && currentSection) {
			const existing = sections[currentSection][lastKey]
			const continuation = trimmed.trim()
			if (continuation) {
				sections[currentSection][lastKey] = existing ? `${existing}\n${continuation}` : continuation
			}

			continue
		}

		// Key = value pair (supports both = and : as delimiters)
		const kvMatch = /^([^=:]+)[=:](.*)$/.exec(trimmed)
		if (kvMatch && currentSection) {
			const key = kvMatch[1].trim()
			const value = kvMatch[2].trim()
			sections[currentSection] ??= {}
			sections[currentSection][key] = value
			lastKey = key
		}
	}

	return sections
}

/** Split a multi-line value into individual non-empty lines. */
export function splitMultiline(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}
