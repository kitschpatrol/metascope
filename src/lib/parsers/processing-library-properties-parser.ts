/**
 * Parser for Processing `library.properties` files.
 * These are flat UTF-8 `key=value` properties files (no sections, no nesting)
 * used by the Processing IDE (PDE) contribution manager. Comment lines
 * start with `#`. Only the first `=` on each line is the delimiter.
 *
 * Processing libraries use a distinctive author syntax with Markdown hyperlinks
 * (`[Name](URL)`), a split version scheme (`version` integer + `prettyVersion`
 * string), and Processing revision numbers for compatibility bounds.
 * @see https://github.com/benfry/processing4/wiki/Library-Guidelines
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Parsed author entry with optional URL from markdown syntax. */
export type ProcessingLibraryPropertiesAuthorEntry = {
	name: string
	url: string | undefined
}

/** Canonical Processing library categories. */
const CANONICAL_CATEGORIES = [
	'3D',
	'Animation',
	'Compilations',
	'Data',
	'Fabrication',
	'Geometry',
	'GUI',
	'Hardware',
	'I/O',
	'Language',
	'Math',
	'Simulation',
	'Sound',
	'Utilities',
	'Typography',
	'Video & Vision',
] as const

export type ProcessingLibraryPropertiesCategory = (typeof CANONICAL_CATEGORIES)[number]

/** Map from letters-only lowercase to canonical category form. */
const CATEGORY_MAP = new Map<string, ProcessingLibraryPropertiesCategory>(
	CANONICAL_CATEGORIES.map((cat) => [cat.replaceAll(/[^a-z]/gi, '').toLowerCase(), cat]),
)

// Explicit aliases for categories that lose digits/symbols when stripped
CATEGORY_MAP.set('3d', '3D')

/** Parsed result from a Processing `library.properties` file. */
export type ProcessingLibraryProperties = {
	/** Parsed author entries with optional URLs. */
	authors: ProcessingLibraryPropertiesAuthorEntry[]
	/** Normalized categories. */
	categories: ProcessingLibraryPropertiesCategory[]
	/** Direct download URL for the .zip distribution. */
	download: string | undefined
	/** Numeric identifier assigned by Processing contribution manager. */
	id: string | undefined
	/** Maximum Processing revision, or 0 for no upper constraint. */
	maxRevision: number
	/** Minimum Processing revision, or 0 for no lower constraint. */
	minRevision: number
	/** Library name. */
	name: string | undefined
	/** Extended description paragraph. */
	paragraph: string | undefined
	/** Human-readable version string. */
	prettyVersion: string | undefined
	/** Raw key-value pairs. */
	raw: Record<string, string>
	/** One-sentence description. */
	sentence: string | undefined
	/** Contribution type (library, tool, mode, examples). */
	type: string | undefined
	/** Project URL. */
	url: string | undefined
	/** Integer release counter. */
	version: number
}

// ─── Core parser ────────────────────────────────────────────────────

/** Helper to get a value from the raw record. */
function get(raw: Record<string, string>, key: string): string | undefined {
	return raw[key]
}

/**
 * Parse a Processing `library.properties` content string into a structured object.
 */
export function parseProcessingLibraryProperties(content: string): ProcessingLibraryProperties {
	const raw: Record<string, string> = {}

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim()
		// Skip blank lines and comments
		if (line.length === 0 || line.startsWith('#')) continue

		const eqIndex = line.indexOf('=')
		if (eqIndex === -1) continue

		const key = line.slice(0, eqIndex).trim()
		const value = line.slice(eqIndex + 1).trim()
		if (key.length > 0) raw[key] = value
	}

	const versionRaw = get(raw, 'version') ?? '0'
	const versionParsed = Number.parseInt(versionRaw, 10)

	const prettyVersionRaw = get(raw, 'prettyVersion')
	const prettyVersion = prettyVersionRaw ? stripInlineComment(prettyVersionRaw) : undefined

	const minRevisionRaw = get(raw, 'minRevision')
	const minParsed = minRevisionRaw ? Number.parseInt(minRevisionRaw, 10) : 0

	const maxRevisionRaw = get(raw, 'maxRevision')
	const maxParsed = maxRevisionRaw ? Number.parseInt(maxRevisionRaw, 10) : 0

	return {
		authors: parseAuthors(get(raw, 'authors') ?? get(raw, 'authorList') ?? ''),
		categories: parseCategories(get(raw, 'categories') ?? get(raw, 'category') ?? ''),
		download: nonEmpty(get(raw, 'download')),
		id: nonEmpty(get(raw, 'id')),
		maxRevision: Number.isNaN(maxParsed) ? 0 : maxParsed,
		minRevision: Number.isNaN(minParsed) ? 0 : minParsed,
		name: nonEmpty(get(raw, 'name')),
		paragraph: nonEmpty(get(raw, 'paragraph')),
		prettyVersion: nonEmpty(prettyVersion),
		raw,
		sentence: nonEmpty(get(raw, 'sentence')),
		type: nonEmpty(get(raw, 'type')),
		url: nonEmpty(unescapeUrl(get(raw, 'url') ?? '')),
		version: Number.isNaN(versionParsed) ? 0 : versionParsed,
	}
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Return a trimmed string, or undefined if empty/whitespace-only. */
function nonEmpty(value: string | undefined): string | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Strip trailing inline comments from a value.
 * Matches the pattern ` # comment text` (space-hash-space).
 * Used for prettyVersion where template comments like `# This is treated as a String`
 * would otherwise corrupt the version string.
 */
function stripInlineComment(value: string): string {
	const index = value.indexOf(' # ')
	return index === -1 ? value : value.slice(0, index).trim()
}

/**
 * Unescape backslash-escaped colons in URLs.
 * Some Processing fixtures use `https\://` instead of `https://`.
 */
function unescapeUrl(value: string): string {
	return value.replaceAll(String.raw`\:`, ':')
}

// ─── Author parsing ────────────────────────────────────────────────
//
// Handles all real-world patterns found in Processing fixtures:
//   [Name](url)
//   [Name](url), [Name2](url2)
//   [Name](url) and others
//   [Name1, Name2](url)  → two persons sharing the same URL
//   Plain Name and Plain Name2
//   Mixed: [Name](url) and Plain Name

/**
 * Parse a Processing authors/authorList value into AuthorEntry[].
 * Preserves original order of appearance.
 */
function parseAuthors(value: string): ProcessingLibraryPropertiesAuthorEntry[] {
	const trimmed = value.trim()
	if (trimmed.length === 0) return []

	const results: ProcessingLibraryPropertiesAuthorEntry[] = []

	// Scan left-to-right, extracting [name](url) tokens and gaps between them
	let cursor = 0

	while (cursor < trimmed.length) {
		// Look for next markdown link
		const bracketStart = trimmed.indexOf('[', cursor)

		if (bracketStart === -1) {
			// No more markdown links — rest is plain text
			addPlainAuthors(trimmed.slice(cursor), results)
			break
		}

		// Process plain text before this markdown link
		if (bracketStart > cursor) {
			addPlainAuthors(trimmed.slice(cursor, bracketStart), results)
		}

		// Extract [name](url)
		const bracketEnd = trimmed.indexOf(']', bracketStart)
		if (bracketEnd === -1) {
			// Malformed — treat rest as plain text
			addPlainAuthors(trimmed.slice(bracketStart), results)
			break
		}

		const parenStart = trimmed.indexOf('(', bracketEnd)
		if (parenStart === -1 || parenStart !== bracketEnd + 1) {
			// No `(` immediately after `]` — treat bracket content as plain text
			addPlainAuthors(trimmed.slice(bracketStart, bracketEnd + 1), results)
			cursor = bracketEnd + 1
			continue
		}

		const parenEnd = trimmed.indexOf(')', parenStart)
		if (parenEnd === -1) {
			// Malformed — treat rest as plain text
			addPlainAuthors(trimmed.slice(bracketStart), results)
			break
		}

		const namesPart = trimmed.slice(bracketStart + 1, bracketEnd).trim()
		const rawUrl = trimmed.slice(parenStart + 1, parenEnd).trim()
		const url = nonEmpty(unescapeUrl(rawUrl))

		// Handle multiple names in one link: [Name1, Name2](url)
		const names = namesPart
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0)
		for (const name of names) {
			results.push({ name, url })
		}

		cursor = parenEnd + 1
	}

	return results
}

/**
 * Split plain text on ` and `, `,`, `&` to extract author names.
 * Filters out bare "others" entries.
 */
function addPlainAuthors(text: string, results: ProcessingLibraryPropertiesAuthorEntry[]): void {
	const parts = text
		.split(/\band\b|,|&/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && s.toLowerCase() !== 'others')

	for (const name of parts) {
		results.push({ name, url: undefined })
	}
}

// ─── Category parsing ──────────────────────────────────────────────

/**
 * Parse and normalize a comma-separated categories value.
 * Strips surrounding quotes, normalizes to canonical Processing categories
 * using letters-only lowercase matching.
 */
function parseCategories(value: string): ProcessingLibraryPropertiesCategory[] {
	const trimmed = value.trim()
	if (trimmed.length === 0) return []

	const results: ProcessingLibraryPropertiesCategory[] = []

	for (const part of trimmed.split(',')) {
		// Strip surrounding quotes
		const stripped = part.trim().replaceAll(/^"|"$/g, '').trim()
		if (stripped.length === 0) continue

		const key = stripped.replaceAll(/[^a-z0-9]/gi, '').toLowerCase()
		if (key.length === 0) continue

		const canonical = CATEGORY_MAP.get(key)
		if (canonical && !results.includes(canonical)) {
			results.push(canonical)
		}
	}

	return results
}
