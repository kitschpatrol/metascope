// CSpell:words cinderblock libraryUrl

/**
 * Source and parser for Cinder `cinderblock.xml` files.
 *
 * CinderBlock is a package format for the Cinder C++ creative coding framework.
 * Metadata lives primarily in attributes on the `<block>` element, with child
 * elements for OS support (`<supports>`) and dependencies (`<requires>`).
 *
 * Uses `fast-xml-parser` with attribute parsing enabled.
 */

import is from '@sindresorhus/is'
import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const cinderCinderblockSchema = z.object({
	/** Block author name. */
	author: nonEmptyString,
	/** Git repository URL. */
	git: optionalUrl,
	/** Block identifier (e.g. "info.v002.syphon"). */
	id: nonEmptyString,
	/** Library or libraryUrl reference link. */
	library: optionalUrl,
	/** License identifier. */
	license: nonEmptyString,
	/** Block display name. */
	name: nonEmptyString,
	/** Software dependencies from `<requires>` elements. */
	requires: stringArray,
	/** Block summary / description. */
	summary: nonEmptyString,
	/** Supported operating systems from `<supports os="...">` elements. */
	supports: stringArray,
	/** Project URL. */
	url: optionalUrl,
	/** Version string. */
	version: nonEmptyString,
})

export type CinderCinderblock = z.infer<typeof cinderCinderblockSchema>

export type CinderCinderblockXmlData = SourceRecord<CinderCinderblock> | undefined

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
export function parse(content: string): CinderCinderblock | undefined {
	const parser = new XMLParser({
		attributeNamePrefix: '@_',
		ignoreAttributes: false,
		parseTagValue: false,
	})

	let data: Record<string, unknown>
	try {
		const parsed: unknown = parser.parse(content)
		if (!is.plainObject(parsed)) return undefined
		data = parsed
	} catch {
		return undefined
	}

	if (!is.plainObject(data.cinder)) return undefined
	const { cinder } = data
	if (!is.plainObject(cinder.block)) return undefined
	const { block } = cinder

	return cinderCinderblockSchema.parse({
		author: getAttribute(block, 'author'),
		git: getAttribute(block, 'git'),
		id: getAttribute(block, 'id'),
		library: getAttribute(block, 'library') ?? getAttribute(block, 'libraryUrl'),
		license: getAttribute(block, 'license'),
		name: getAttribute(block, 'name'),
		requires: parseDependencies(block),
		summary: getAttribute(block, 'summary'),
		supports: parseOperatingSystems(block),
		url: getAttribute(block, 'url'),
		version: getAttribute(block, 'version'),
	})
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

	for (const support of ensureArray(block.supports)) {
		if (!is.plainObject(support)) continue
		const os = getAttribute(support, 'os')
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

	for (const dep of ensureArray(block.requires)) {
		if (typeof dep !== 'string') continue
		const trimmed = dep.trim()
		if (trimmed.length > 0) {
			results.push(trimmed)
		}
	}

	return results
}

// ─── Source ─────────────────────────────────────────────────────────

export const cinderCinderblockXmlSource: MetadataSource<'cinderCinderblockXml'> = {
	async extract(context: SourceContext): Promise<CinderCinderblockXmlData> {
		const filePath = resolve(context.path, 'cinderblock.xml')
		let content: string
		try {
			content = await readFile(filePath, 'utf8')
		} catch {
			return undefined
		}

		log.debug('Extracting Cinder cinderblock.xml metadata...')
		const data = parse(content)
		if (!data) return undefined
		return { data, source: filePath }
	},
	key: 'cinderCinderblockXml',
	phase: 1,}
