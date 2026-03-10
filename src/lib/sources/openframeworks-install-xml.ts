/**
 * Source and parser for legacy openFrameworks addon `install.xml` files.
 *
 * This is a legacy format predating `addon_config.mk`. The root element is
 * `<install>`, with flat metadata elements (`<name>`, `<version>`, `<author>`,
 * etc.) followed by build configuration in an `<add>` block.
 *
 * Since `install.xml` is a generic filename, the parser validates that the
 * content is actually an openFrameworks addon by checking for the `<install>`
 * root element and the presence of "addons" in the file content.
 *
 * Uses `fast-xml-parser` with attribute parsing enabled to read `<lib os="...">`
 * attributes for operating system inference.
 */

import is from '@sindresorhus/is'
import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const openframeworksInstallXmlSchema = z.object({
	/** Addon author name. */
	author: nonEmptyString,
	/** Source code repository URL. */
	codeUrl: optionalUrl,
	/** Description of the addon. */
	description: nonEmptyString,
	/** Download URL. */
	downloadUrl: optionalUrl,
	/** Addon display name. */
	name: nonEmptyString,
	/** Supported operating systems from `<lib os="...">` attributes. */
	operatingSystems: stringArray,
	/** Software dependencies from `<requires>` elements. */
	requirements: stringArray,
	/** Website URL. */
	siteUrl: optionalUrl,
	/** Generic URL (used when no code_url / site_url provided). */
	url: optionalUrl,
	/** Version string. */
	version: nonEmptyString,
})

export type OpenframeworksInstallXml = z.infer<typeof openframeworksInstallXmlSchema>

export type OpenframeworksInstallXmlData =
	| OneOrMany<SourceRecord<OpenframeworksInstallXml>>
	| undefined

/**
 * Map `<lib os="...">` attribute values to human-readable OS names.
 */
const LIB_OS_MAP: Record<string, string> = {
	linux: 'Linux',
	mac: 'macOS',
	win32: 'Windows',
}

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a legacy openFrameworks `install.xml` content string into a structured object.
 * Returns undefined if the XML is malformed, missing the `<install>` root element,
 * or does not appear to be an openFrameworks addon.
 */
export function parse(content: string): OpenframeworksInstallXml | undefined {
	// Validate: must contain "addons" (appears in oF addon file paths)
	if (!content.toLowerCase().includes('addons')) {
		return undefined
	}

	// Fix malformed CDATA: some files use <[CDATA[...]]> instead of <![CDATA[...]]>
	const fixedContent = content.replaceAll('<[CDATA[', '<![CDATA[')

	const parser = new XMLParser({
		attributeNamePrefix: '@_',
		ignoreAttributes: false,
		parseTagValue: false,
	})

	let data: Record<string, unknown>
	try {
		const parsed: unknown = parser.parse(fixedContent)
		if (!is.plainObject(parsed)) return undefined
		data = parsed
	} catch {
		return undefined
	}

	// Validate: must have <install> root element
	if (!is.plainObject(data.install)) return undefined
	const { install } = data

	return openframeworksInstallXmlSchema.parse({
		author: getString(install.author),
		codeUrl: getString(install.code_url),
		description: getString(install.description),
		downloadUrl: getString(install.download_url),
		name: getString(install.name),
		operatingSystems: parseOperatingSystems(install),
		requirements: parseRequirements(install),
		siteUrl: getString(install.site_url),
		url: getString(install.url),
		version: getString(install.version),
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
 * Get a trimmed non-empty string from a parsed XML value.
 * Returns undefined for empty strings, non-strings, or whitespace-only values.
 */
function getString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Extract software requirements from `<requires>`.
 * Handles three variants:
 * 1. Empty — skip
 * 2. Free text — emit as-is
 * 3. Structured `<addon>` children — emit each separately
 */
function parseRequirements(install: Record<string, unknown>): string[] {
	const { requires } = install
	if (requires === undefined || requires === null) return []

	// Free text: <requires>some text</requires>
	if (typeof requires === 'string') {
		const trimmed = requires.trim()
		return trimmed.length > 0 ? [trimmed] : []
	}

	// Structured: <requires><addon>name</addon>...</requires>
	if (is.plainObject(requires)) {
		const results: string[] = []
		for (const addon of ensureArray(requires.addon)) {
			const name = getString(addon)
			if (name) {
				results.push(name)
			}
		}

		return results
	}

	return []
}

/**
 * Extract operating system information from `<lib os="...">` attributes
 * found within `<add><link>` sections.
 */
function parseOperatingSystems(install: Record<string, unknown>): string[] {
	if (!is.plainObject(install.add)) return []
	const { add } = install
	if (!is.plainObject(add.link)) return []
	const { link } = add

	const results: string[] = []
	const seen = new Set<string>()

	for (const library of ensureArray(link.lib)) {
		if (!is.plainObject(library)) continue
		const os = getString(library['@_os'])
		if (os) {
			const mapped = LIB_OS_MAP[os.toLowerCase()] ?? os
			if (!seen.has(mapped)) {
				seen.add(mapped)
				results.push(mapped)
			}
		}
	}

	return results
}

// ─── Source ──────────────────────────────────────────────────────────

export const openframeworksInstallXmlSource = defineSource<'openframeworksInstallXml'>({
	async getInputs(context) {
		return getMatches(context.options, ['install.xml'])
	},
	key: 'openframeworksInstallXml',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const data = parse(content)
		if (data !== undefined) {
			return { data, source: input }
		}
	},
	phase: 1,
})
