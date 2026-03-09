import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from './source'
import { parseLibraryProperties } from '../parsers/library-properties-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'
import { defineSource, getMatches } from './source'

// ─── Schema ─────────────────────────────────────────────────────────

const arduinoLibraryPropertiesPersonEntrySchema = z.object({
	email: z.string().optional(),
	name: z.string(),
})

const arduinoLibraryPropertiesDependencyEntrySchema = z.object({
	name: z.string(),
	versionConstraint: z.string().optional(),
})

/** Canonical Arduino library categories. */
const CANONICAL_CATEGORIES = [
	'Communication',
	'Data Processing',
	'Data Storage',
	'Device Control',
	'Display',
	'Other',
	'Sensors',
	'Signal Input/Output',
	'Timing',
	'Uncategorized',
] as const

/** Map from letters-only lowercase to canonical category form. */
const CATEGORY_MAP = new Map<string, (typeof CANONICAL_CATEGORIES)[number]>(
	CANONICAL_CATEGORIES.map((cat) => [cat.replaceAll(/[^a-z]/gi, '').toLowerCase(), cat]),
)

// Singular→plural coercion
CATEGORY_MAP.set('sensor', 'Sensors')

const arduinoLibraryPropertiesSchema = z.object({
	/** Comma-separated architecture identifiers, or ["*"] for all. */
	architectures: stringArray,
	/** Parsed author entries. */
	authors: z.array(arduinoLibraryPropertiesPersonEntrySchema),
	/** Normalized category, or undefined if invalid/empty. */
	category: z.enum(CANONICAL_CATEGORIES).optional(),
	/** Parsed dependency entries. */
	depends: z.array(arduinoLibraryPropertiesDependencyEntrySchema),
	/** Top-level email field (non-standard, used in some fixtures). */
	email: nonEmptyString,
	/** Comma-separated header files. */
	includes: stringArray,
	/** License value (non-standard field). */
	license: nonEmptyString,
	/** Parsed maintainer entry. */
	maintainer: arduinoLibraryPropertiesPersonEntrySchema.optional(),
	/** Library name. */
	name: nonEmptyString,
	/** Extended description paragraph. */
	paragraph: nonEmptyString,
	/** Raw key-value pairs. */
	raw: z.record(z.string(), z.string()),
	/** Repository URL (non-standard field). */
	repository: optionalUrl,
	/** One-sentence description. */
	sentence: nonEmptyString,
	/** Project URL. */
	url: optionalUrl,
	/** Library version. */
	version: nonEmptyString,
})

export type ArduinoLibraryProperties = z.infer<typeof arduinoLibraryPropertiesSchema>

type ArduinoLibraryPropertiesCategory = NonNullable<ArduinoLibraryProperties['category']>
type ArduinoLibraryPropertiesPersonEntry = ArduinoLibraryProperties['authors'][number]
type ArduinoLibraryPropertiesDependencyEntry = ArduinoLibraryProperties['depends'][number]

export type ArduinoLibraryPropertiesData =
	| OneOrMany<SourceRecord<ArduinoLibraryProperties>>
	| undefined

// ─── Parse ──────────────────────────────────────────────────────────

/**
 * Parse an Arduino `library.properties` content string into a structured object.
 */
export function parse(content: string): ArduinoLibraryProperties {
	const raw = parseLibraryProperties(content)

	const includesValue = get(raw, 'includes')

	return arduinoLibraryPropertiesSchema.parse({
		architectures: splitTrimmed(get(raw, 'architectures') ?? '*'),
		authors: parsePersonList(get(raw, 'author') ?? ''),
		category: normalizeCategory(get(raw, 'category')),
		depends: parseDependencies(get(raw, 'depends') ?? get(raw, 'dependencies') ?? ''),
		email: nonEmpty(get(raw, 'email')),
		includes: includesValue ? splitTrimmed(includesValue) : [],
		license: nonEmpty(get(raw, 'license')),
		maintainer: parsePersonList(get(raw, 'maintainer') ?? '')[0],
		name: nonEmpty(get(raw, 'name')),
		paragraph: nonEmpty(get(raw, 'paragraph')),
		raw,
		repository: nonEmpty(get(raw, 'repository')),
		sentence: nonEmpty(get(raw, 'sentence')),
		url: nonEmpty(get(raw, 'url')),
		version: nonEmpty(get(raw, 'version')),
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
 * Normalize a category string to the canonical Arduino category.
 * Strips all non-letter characters, lowercases, and matches against the canonical map.
 * For comma-separated values (e.g. "Sensors, Timing"), takes the first valid match.
 */
function normalizeCategory(
	value: string | undefined,
): ArduinoLibraryPropertiesCategory | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed.length === 0) return undefined

	// Split on commas first (handles "Sensors, Timing" edge case)
	for (const part of trimmed.split(',')) {
		const key = part.replaceAll(/[^a-z]/gi, '').toLowerCase()
		if (key.length === 0) continue
		const canonical = CATEGORY_MAP.get(key)
		if (canonical) return canonical
	}

	return undefined
}

/**
 * Parse a comma-separated list of `Name <email>` entries into PersonEntry[].
 */
function parsePersonList(value: string): ArduinoLibraryPropertiesPersonEntry[] {
	const trimmed = value.trim()
	if (trimmed.length === 0) return []

	const results: ArduinoLibraryPropertiesPersonEntry[] = []
	for (const entry of trimmed.split(',')) {
		const trimmedEntry = entry.trim()

		// Match "Name <email>" pattern
		const bracketIndex = trimmedEntry.indexOf('<')
		if (bracketIndex !== -1) {
			const closeBracket = trimmedEntry.indexOf('>', bracketIndex)
			if (closeBracket !== -1) {
				const name = trimmedEntry.slice(0, bracketIndex).trim()
				const email = trimmedEntry.slice(bracketIndex + 1, closeBracket).trim()
				if (name.length > 0 || email.length > 0) {
					results.push({ email: email.length > 0 ? email : undefined, name })
				}

				continue
			}
		}

		// Plain name without email
		if (trimmedEntry.length > 0) {
			results.push({ email: undefined, name: trimmedEntry })
		}
	}

	return results
}

/**
 * Parse a comma-separated list of dependencies with optional version constraints.
 * e.g. "ArduinoHttpClient (>=1.0.0), ArduinoJson" →
 *   [{ name: "ArduinoHttpClient", versionConstraint: ">=1.0.0" }, ...]
 */
function parseDependencies(value: string): ArduinoLibraryPropertiesDependencyEntry[] {
	const trimmed = value.trim()
	if (trimmed.length === 0) return []

	const results: ArduinoLibraryPropertiesDependencyEntry[] = []
	for (const entry of trimmed.split(',')) {
		const trimmedEntry = entry.trim()
		if (trimmedEntry.length === 0) continue

		// Match "Name (constraint)" pattern
		const parenIndex = trimmedEntry.indexOf('(')
		if (parenIndex !== -1) {
			const closeParen = trimmedEntry.indexOf(')', parenIndex)
			if (closeParen !== -1) {
				const name = trimmedEntry.slice(0, parenIndex).trim()
				const constraint = trimmedEntry.slice(parenIndex + 1, closeParen).trim()
				if (name.length > 0) {
					results.push({
						name,
						versionConstraint: constraint.length > 0 ? constraint : undefined,
					})
					continue
				}
			}
		}

		// Plain dependency name
		results.push({ name: trimmedEntry, versionConstraint: undefined })
	}

	return results
}

/** Split a comma-separated string into trimmed, non-empty parts. */
function splitTrimmed(value: string): string[] {
	return value
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

// ─── Availability ───────────────────────────────────────────────────

/**
 * Arduino-specific fields that distinguish library.properties from
 * Processing's identically-named format.
 */
const ARDUINO_SPECIFIC_FIELDS = new Set(['architectures', 'depends', 'dot_a_linkage', 'maintainer'])

/** Processing-exclusive fields that rule out Arduino. */
const PROCESSING_EXCLUSIVE_FIELDS = new Set(['authors', 'minrevision', 'prettyversion'])

/**
 * Validate that a library.properties file is Arduino (not Processing).
 * Requires name=, version=, author= and either an Arduino-specific field
 * or no Processing-exclusive fields.
 */
function isArduinoLibraryProperties(content: string): boolean {
	const raw = parseLibraryProperties(content)
	const keys = new Set(Object.keys(raw))

	// Must have the three base fields
	if (!keys.has('name') || !keys.has('version') || !keys.has('author')) return false

	// If any Arduino-specific field is present, it's Arduino
	for (const field of ARDUINO_SPECIFIC_FIELDS) {
		if (keys.has(field)) return true
	}

	// If any Processing-exclusive field is present, it's not Arduino
	for (const field of PROCESSING_EXCLUSIVE_FIELDS) {
		if (keys.has(field)) return false
	}

	// Ambiguous but default to Arduino
	return true
}

export const arduinoLibraryPropertiesSource = defineSource<'arduinoLibraryProperties'>({
	async getInputs(context) {
		return getMatches(context.options, ['library.properties'])
	},
	key: 'arduinoLibraryProperties',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		if (isArduinoLibraryProperties(content)) {
			return { data: parse(content), source: input }
		}
	},
	phase: 1,
})
