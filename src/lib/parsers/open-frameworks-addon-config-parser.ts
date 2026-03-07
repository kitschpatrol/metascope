/**
 * Parser for openFrameworks `addon_config.mk` files.
 *
 * These files use a GNU Makefile-like syntax with section headers (lines
 * ending in `:`) and variable assignments (`VAR = value` or `VAR += value`).
 * This parser extracts metadata from the `meta:` section and structural
 * information (dependencies, platform sections) from the rest of the file.
 *
 * The parser is intentionally simple — no Make variable expansion, no
 * includes, no conditionals. It mirrors the line-by-line algorithm used
 * by the openFrameworks Project Generator.
 */

/** Parsed result from an `addon_config.mk` file. */
export type OpenFrameworksAddonConfig = {
	/** `ADDON_AUTHOR` from `meta:` section. */
	author?: string
	/** `ADDON_DEPENDENCIES` from `common:` section (space-separated addon names). */
	dependencies: string[]
	/** `ADDON_DESCRIPTION` from `meta:` section. */
	description?: string
	/** `ADDON_NAME` from `meta:` section. */
	name?: string
	/** Platform section names that contain at least one variable assignment. */
	platformSections: string[]
	/** `ADDON_TAGS` from `meta:` section (quote-aware tokenized). */
	tags: string[]
	/** `ADDON_URL` from `meta:` section. */
	url?: string
}

/** Section header pattern: a word (with optional hyphens/slashes) followed by a colon. */
const SECTION_RE = /^[\w/][\w/-]*:$/

/** Variable assignment pattern: VARNAME = value  or  VARNAME += value */
const ASSIGNMENT_RE = /^(\w+)\s*(\+?=)\s*(.*)/

/**
 * Sections that are not platform-specific and should be excluded
 * from operatingSystem inference.
 */
const NON_PLATFORM_SECTIONS = new Set(['all', 'common', 'meta'])

/**
 * Parse an `addon_config.mk` file and return structured metadata.
 */
export function parseOpenFrameworksAddonConfig(content: string): OpenFrameworksAddonConfig {
	const metaVariables = new Map<string, string[]>()
	const commonDependencies: string[] = []
	const platformSectionsWithContent = new Set<string>()

	let currentSection = ''
	let currentSectionHasAssignment = false

	for (const rawLine of content.split('\n')) {
		// Strip inline comments and trim
		const line = rawLine.replace(/#.*$/, '').trim()
		if (line.length === 0) continue

		// Section header
		if (SECTION_RE.test(line)) {
			// Record the previous section if it had content
			if (currentSectionHasAssignment && !NON_PLATFORM_SECTIONS.has(currentSection)) {
				platformSectionsWithContent.add(currentSection)
			}

			currentSection = line.slice(0, -1) // Strip trailing ':'
			currentSectionHasAssignment = false
			continue
		}

		// Variable assignment
		const match = ASSIGNMENT_RE.exec(line)
		if (!match) continue

		const [, variableName, operator, rawValue] = match
		currentSectionHasAssignment = true

		if (currentSection === 'meta') {
			// For meta: section, store variable values
			const values = tokenizeValues(rawValue)
			if (operator === '+=') {
				const existing = metaVariables.get(variableName) ?? []
				metaVariables.set(variableName, [...existing, ...values])
			} else {
				metaVariables.set(variableName, values)
			}
		} else if (currentSection === 'common' && variableName === 'ADDON_DEPENDENCIES') {
			const values = tokenizeValues(rawValue)
			if (operator === '+=') {
				commonDependencies.push(...values)
			} else {
				commonDependencies.length = 0
				commonDependencies.push(...values)
			}
		}
	}

	// Record the last section if it had content
	if (currentSectionHasAssignment && !NON_PLATFORM_SECTIONS.has(currentSection)) {
		platformSectionsWithContent.add(currentSection)
	}

	return {
		author: singleValue(metaVariables, 'ADDON_AUTHOR'),
		dependencies: commonDependencies,
		description: singleValue(metaVariables, 'ADDON_DESCRIPTION'),
		name: singleValue(metaVariables, 'ADDON_NAME'),
		platformSections: [...platformSectionsWithContent],
		tags: metaVariables.get('ADDON_TAGS') ?? [],
		url: singleValue(metaVariables, 'ADDON_URL'),
	}
}

/**
 * Get a single string value from the meta variables map.
 * Joins multiple tokens with spaces (for values split across `+=` lines).
 * Returns undefined for empty/whitespace-only results.
 */
function singleValue(variables: Map<string, string[]>, key: string): string | undefined {
	const values = variables.get(key)
	if (!values || values.length === 0) return undefined
	const joined = values.join(' ').trim()
	return joined.length > 0 ? joined : undefined
}

/**
 * Tokenize a value string, handling both bare tokens and "quoted multi-word"
 * tokens. For example:
 *   `"computer vision" "opencv" bare` → `["computer vision", "opencv", "bare"]`
 */
function tokenizeValues(raw: string): string[] {
	const trimmed = raw.trim()
	if (trimmed.length === 0) return []

	const values: string[] = []
	// Match quoted "multi-word" tokens or bare tokens
	for (const [, quoted, bare] of trimmed.matchAll(/"([^"]+)"|(\S+)/g)) {
		const value = quoted || bare
		if (value.length > 0) {
			values.push(value)
		}
	}

	return values
}
