// CSpell:words cinderblock libraryUrl

/**
 * Parser for Cinder `cinderblock.xml` files.
 *
 * CinderBlock is a package format for the Cinder C++ creative coding framework.
 * Metadata lives primarily in attributes on the `<block>` element, with child
 * elements for OS support (`<supports>`) and dependencies (`<requires>`).
 *
 * Uses `fast-xml-parser` with attribute parsing enabled.
 */

import { XMLParser } from 'fast-xml-parser'

// ─── Types ──────────────────────────────────────────────────────────

/** Parsed result from a `cinderblock.xml` file. */
export type CinderCinderblock = {
	/** Block author name. */
	author?: string
	/** Git repository URL. */
	git?: string
	/** Block identifier (e.g. "info.v002.syphon"). */
	id?: string
	/** License identifier. */
	license?: string
	/** Library or libraryUrl reference link. */
	library?: string
	/** Block display name. */
	name?: string
	/** Software dependencies from `<requires>` elements. */
	requires: string[]
	/** Block summary / description. */
	summary?: string
	/** Supported operating systems from `<supports os="...">` elements. */
	supports: string[]
	/** Project URL. */
	url?: string
	/** Version string. */
	version?: string
}

/**
 * Map CinderBlock OS identifiers to human-readable OS names.
 */
const OS_MAP: Record<string, string> = {
	ios: 'iOS',
	linux: 'Linux',
	macosx: 'macOS',
	msw: 'Windows',
}

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a `cinderblock.xml` content string into a structured object.
 * Returns undefined if the XML is malformed or missing the expected structure.
 */
export function parseCinderCinderblock(content: string): CinderCinderblock | undefined {
	const parser = new XMLParser({
		attributeNamePrefix: '@_',
		ignoreAttributes: false,
		parseTagValue: false,
	})

	let data: Record<string, unknown>
	try {
		data = parser.parse(content) as Record<string, unknown>
	} catch {
		return undefined
	}

	const cinder = data.cinder as Record<string, unknown> | undefined
	if (!cinder) return undefined

	const block = cinder.block as Record<string, unknown> | undefined
	if (!block) return undefined

	return {
		author: getAttribute(block, 'author'),
		git: getAttribute(block, 'git'),
		id: getAttribute(block, 'id'),
		license: getAttribute(block, 'license'),
		library: getAttribute(block, 'library') ?? getAttribute(block, 'libraryUrl'),
		name: getAttribute(block, 'name'),
		requires: parseDependencies(block),
		summary: getAttribute(block, 'summary'),
		supports: parseOperatingSystems(block),
		url: getAttribute(block, 'url'),
		version: getAttribute(block, 'version'),
	}
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Ensure a value is an array (XML parser may return single objects or arrays).
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Get a trimmed string attribute from a parsed XML element.
 * fast-xml-parser stores attributes with the `@_` prefix.
 */
function getAttribute(element: Record<string, unknown>, name: string): string | undefined {
	const value = element[`@_${name}`]
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Extract deduplicated, mapped operating system names from `<supports os="...">` elements.
 */
function parseOperatingSystems(block: Record<string, unknown>): string[] {
	const results: string[] = []
	const seen = new Set<string>()

	for (const support of ensureArray(block.supports as Record<string, unknown> | undefined)) {
		if (typeof support !== 'object' || support === null) continue
		const os = getAttribute(support as Record<string, unknown>, 'os')
		if (os) {
			const mapped = OS_MAP[os.toLowerCase()] ?? os
			if (!seen.has(mapped)) {
				seen.add(mapped)
				results.push(mapped)
			}
		}
	}

	return results
}

/**
 * Extract software dependencies from `<requires>` elements.
 */
function parseDependencies(block: Record<string, unknown>): string[] {
	const results: string[] = []

	for (const dep of ensureArray(block.requires as string | string[] | undefined)) {
		if (typeof dep !== 'string') continue
		const trimmed = dep.trim()
		if (trimmed.length > 0) {
			results.push(trimmed)
		}
	}

	return results
}
