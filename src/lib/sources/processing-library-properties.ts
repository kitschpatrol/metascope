import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { parseLibraryProperties } from '../parsers/library-properties-parser'
import { defineSource } from '../source'
import { nonEmptyString, optionalUrl } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const processingLibraryPropertiesAuthorEntrySchema = z.object({
	name: z.string(),
	url: z.string().optional(),
})

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

/** Map from letters-only lowercase to canonical category form. */
const CATEGORY_MAP = new Map<string, (typeof CANONICAL_CATEGORIES)[number]>(
	CANONICAL_CATEGORIES.map((cat) => [cat.replaceAll(/[^a-z]/gi, '').toLowerCase(), cat]),
)

// Explicit aliases for categories that lose digits/symbols when stripped
CATEGORY_MAP.set('3d', '3D')

const processingLibraryPropertiesSchema = z.object({
	/** Parsed author entries with optional URLs. */
	authors: z.array(processingLibraryPropertiesAuthorEntrySchema),
	/** Normalized categories. */
	categories: z.array(z.enum(CANONICAL_CATEGORIES)),
	/** Direct download URL for the .zip distribution. */
	download: optionalUrl,
	/** Numeric identifier assigned by Processing contribution manager. */
	id: nonEmptyString,
	/** Maximum Processing revision, or 0 for no upper constraint. */
	maxRevision: z.number(),
	/** Minimum Processing revision, or 0 for no lower constraint. */
	minRevision: z.number(),
	/** Library name. */
	name: nonEmptyString,
	/** Extended description paragraph. */
	paragraph: nonEmptyString,
	/** Human-readable version string. */
	prettyVersion: nonEmptyString,
	/** Raw key-value pairs. */
	raw: z.record(z.string(), z.string()),
	/** One-sentence description. */
	sentence: nonEmptyString,
	/** Contribution type (library, tool, mode, examples). */
	type: nonEmptyString,
	/** Project URL. */
	url: optionalUrl,
	/** Integer release counter. */
	version: z.number(),
})

export type ProcessingLibraryProperties = z.infer<typeof processingLibraryPropertiesSchema>

type ProcessingLibraryPropertiesAuthorEntry = ProcessingLibraryProperties['authors'][number]
type ProcessingLibraryPropertiesCategory = ProcessingLibraryProperties['categories'][number]

export type ProcessingLibraryPropertiesData =
	| OneOrMany<SourceRecord<ProcessingLibraryProperties>>
	| undefined

// ─── Parse ──────────────────────────────────────────────────────────

/**
 * Parse a Processing `library.properties` content string into a structured object.
 */
export function parse(content: string): ProcessingLibraryProperties {
	const raw = parseLibraryProperties(content)

	const versionRaw = get(raw, 'version') ?? '0'
	const versionParsed = Number.parseInt(versionRaw, 10)

	const prettyVersionRaw = get(raw, 'prettyVersion')
	const prettyVersion = prettyVersionRaw ? stripInlineComment(prettyVersionRaw) : undefined

	const minRevisionRaw = get(raw, 'minRevision')
	const minParsed = minRevisionRaw ? Number.parseInt(minRevisionRaw, 10) : 0

	const maxRevisionRaw = get(raw, 'maxRevision')
	const maxParsed = maxRevisionRaw ? Number.parseInt(maxRevisionRaw, 10) : 0

	return processingLibraryPropertiesSchema.parse({
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
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Helper to get a value from the raw record. */
function get(raw: Record<string, string>, key: string): string | undefined {
	return raw[key]
}

/** Return a trimmed string, or undefined if empty/whitespace-only. */
function nonEmpty(value: string | undefined): string | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Strip trailing inline comments from a value.
 * Matches the pattern ` # comment text` (space-hash-space).
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

// ─── Availability ───────────────────────────────────────────────────

/** Processing-specific fields that distinguish from Arduino. */
const PROCESSING_SPECIFIC_FIELDS = new Set([
	'authorList',
	'authors',
	'dependencies',
	'minrevision',
	'prettyversion',
])

/** Arduino-exclusive fields that rule out Processing. */
const ARDUINO_EXCLUSIVE_FIELDS = new Set(['architectures', 'depends', 'maintainer'])

/**
 * Validate that a library.properties file is Processing (not Arduino).
 */
function isProcessingLibraryProperties(content: string): boolean {
	const raw = parseLibraryProperties(content)
	const keys = new Set(Object.keys(raw).map((k) => k.toLowerCase()))

	// Must have base fields
	if (!keys.has('name') || !keys.has('version')) return false

	// If any Arduino-exclusive field is present, it's not Processing
	for (const field of ARDUINO_EXCLUSIVE_FIELDS) {
		if (keys.has(field)) return false
	}

	// Must have at least one Processing-specific field
	for (const field of PROCESSING_SPECIFIC_FIELDS) {
		if (keys.has(field)) return true
	}

	return false
}

export const processingLibraryPropertiesSource = defineSource<'processingLibraryProperties'>({
	async getInputs(context) {
		return getMatches(context.options, ['library.properties'])
	},
	key: 'processingLibraryProperties',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		if (!isProcessingLibraryProperties(content)) {
			return
		}
		return { data: parse(content), source: input }
	},
	phase: 1,
})
