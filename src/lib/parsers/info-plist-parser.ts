// CSpell:words appletvos appletvsimulator Blacktree bundleid createdby iphoneos iphonesimulator plists TVOS watchos watchsimulator webaddress xros

/**
 * Parser for Apple `Info.plist` files.
 *
 * Handles three flavors of Info.plist:
 *   - Standard Apple app/framework bundles (CFBundle* keys)
 *   - Alfred workflow plists (name, createdby, bundleid, etc.)
 *   - TextMate bundle plists (name, contactName, contactEmailRot13, etc.)
 *
 * Uses the `plist` npm package to parse XML plist format.
 */

import plist from 'plist'
import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const infoPlistSchema = z.object({
	/** Application category (humanized from UTI). */
	applicationCategory: nonEmptyString,
	/** Author / creator name. */
	author: nonEmptyString,
	/** Author email (decoded from ROT13 for TextMate bundles). */
	authorEmail: nonEmptyString,
	/** Copyright holder name. */
	copyrightHolder: nonEmptyString,
	/** Copyright year. */
	copyrightYear: nonEmptyString,
	/** Description / readme text. */
	description: nonEmptyString,
	/** Bundle identifier (e.g. "com.example.app"). */
	identifier: nonEmptyString,
	/** Display name of the app or bundle. */
	name: nonEmptyString,
	/** Inferred operating systems. */
	operatingSystems: stringArray,
	/** Processor architecture requirements (e.g. "armv7"). */
	processorRequirements: stringArray,
	/** Homepage URL. */
	url: optionalUrl,
	/** Version string. */
	version: nonEmptyString,
})

export type InfoPlist = z.infer<typeof infoPlistSchema>

type PlistDict = Record<string, unknown>

// ─── Constants ──────────────────────────────────────────────────────

/** Xcode build variable pattern: $(VAR) or ${VAR}. */
const XCODE_VARIABLE_RE = /\$[({][^)}]+[)}]/

/**
 * Map DTPlatformName / CFBundleSupportedPlatforms values to human-readable OS names.
 */
const PLATFORM_NAME_MAP: Record<string, string> = {
	appletvos: 'tvOS',
	appletvsimulator: 'tvOS',
	iphoneos: 'iOS',
	iphonesimulator: 'iOS',
	macosx: 'macOS',
	watchos: 'watchOS',
	watchsimulator: 'watchOS',
	xros: 'visionOS',
}

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse an `Info.plist` content string into a structured object.
 * Returns undefined if the plist is malformed or not a dictionary.
 */
export function parseInfoPlist(content: string): InfoPlist | undefined {
	let data: PlistDict
	try {
		const parsed = plist.parse(content)
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return undefined
		}

		data = parsed as PlistDict
	} catch {
		return undefined
	}

	const name =
		getString(data, 'CFBundleDisplayName') ??
		getString(data, 'CFBundleName') ??
		getString(data, 'name')

	const description = getString(data, 'description')

	const version =
		getString(data, 'CFBundleShortVersionString') ??
		getString(data, 'version') ??
		getString(data, 'CFBundleVersion')

	const identifier = getString(data, 'CFBundleIdentifier') ?? getString(data, 'bundleid')

	const { copyrightHolder, copyrightYear } = parseCopyright(data)

	const authorName = getString(data, 'createdby') ?? getString(data, 'contactName')
	const authorEmailRot13 = getString(data, 'contactEmailRot13')
	const authorEmail = authorEmailRot13 ? rot13(authorEmailRot13) : undefined

	const url = getString(data, 'webaddress')

	const applicationCategory = parseApplicationCategory(data)

	return infoPlistSchema.parse({
		applicationCategory,
		author: authorName,
		authorEmail,
		copyrightHolder,
		copyrightYear,
		description,
		identifier,
		name,
		operatingSystems: parseOperatingSystems(data),
		processorRequirements: parseProcessorRequirements(data),
		url,
		version,
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Get a string value from a plist dict, returning undefined for
 * empty strings, whitespace-only strings, and Xcode variable placeholders.
 */
function getString(data: PlistDict, key: string): string | undefined {
	const value = data[key]
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (trimmed.length === 0) return undefined
	if (XCODE_VARIABLE_RE.test(trimmed)) return undefined
	return trimmed
}

/**
 * ROT13-decode a string (used by TextMate bundles for obfuscated emails).
 */
function rot13(value: string): string {
	return value.replaceAll(/[a-z]/gi, (c) => {
		const base = c <= 'Z' ? 65 : 97
		return String.fromCodePoint(((c.codePointAt(0)! - base + 13) % 26) + base)
	})
}

/**
 * Convert an Apple UTI application category to a human-readable string.
 * e.g. "public.app-category.developer-tools" → "Developer Tools"
 */
function humanizeCategory(uti: string): string {
	const PREFIX = 'public.app-category.'
	if (!uti.startsWith(PREFIX)) return uti

	const slug = uti.slice(PREFIX.length)
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

/**
 * Parse application category from LSApplicationCategoryType.
 */
function parseApplicationCategory(data: PlistDict): string | undefined {
	const category = getString(data, 'LSApplicationCategoryType')
	if (!category) return undefined
	return humanizeCategory(category)
}

/**
 * Parse copyright information from NSHumanReadableCopyright or CFBundleGetInfoString.
 */
function parseCopyright(data: PlistDict): {
	copyrightHolder?: string
	copyrightYear?: string
} {
	const copyrightSource =
		getString(data, 'NSHumanReadableCopyright') ?? getString(data, 'CFBundleGetInfoString')
	if (!copyrightSource) return {}

	// Extract year: look for 4-digit number (typically after ©)
	const yearMatch = /(?:©|\(c\)|copyright)\s*(\d{4})/i.exec(copyrightSource)
	const copyrightYear = yearMatch?.[1]

	// Extract holder: text after the year and optional punctuation/whitespace
	// Common patterns: "Copyright © 2013 MICE Software. All rights reserved."
	const holderMatch = /(?:©|\(c\)|copyright)\s*\d{4}\s*(.+)/i.exec(copyrightSource)
	let copyrightHolder: string | undefined
	if (holderMatch) {
		// Clean up trailing "All rights reserved." and similar
		copyrightHolder = holderMatch[1]
			.replace(/\.\s*all\s+rights\s+reserved\.?/i, '')
			.replace(/[.,;]+$/, '')
			.trim()
		if (copyrightHolder.length === 0) copyrightHolder = undefined
	}

	return { copyrightHolder, copyrightYear }
}

/**
 * Infer operating systems from various plist keys.
 */
function parseOperatingSystems(data: PlistDict): string[] {
	const results: string[] = []
	const seen = new Set<string>()

	function add(value: string) {
		if (!seen.has(value)) {
			seen.add(value)
			results.push(value)
		}
	}

	// Minimum OS versions (most specific — includes version number)
	const minMacOS = getString(data, 'LSMinimumSystemVersion')
	if (minMacOS) {
		add(`macOS >= ${minMacOS}`)
	}

	const minIOS = getString(data, 'MinimumOSVersion')
	if (minIOS) {
		add(`iOS >= ${minIOS}`)
	}

	// If we already emitted versioned strings, no need for bare platform names
	if (results.length > 0) return results

	// DTPlatformName
	const platformName = getString(data, 'DTPlatformName')
	if (platformName) {
		const os = PLATFORM_NAME_MAP[platformName.toLowerCase()]
		if (os) add(os)
	}

	// CFBundleSupportedPlatforms
	const supportedPlatforms = data.CFBundleSupportedPlatforms
	if (Array.isArray(supportedPlatforms)) {
		for (const p of supportedPlatforms) {
			if (typeof p === 'string') {
				const os = PLATFORM_NAME_MAP[p.toLowerCase()]
				if (os) add(os)
			}
		}
	}

	// LSRequiresIPhoneOS
	if (data.LSRequiresIPhoneOS === true && !seen.has('iOS')) {
		add('iOS')
	}

	return results
}

/**
 * Extract processor architecture requirements from UIRequiredDeviceCapabilities.
 */
function parseProcessorRequirements(data: PlistDict): string[] {
	const capabilities = data.UIRequiredDeviceCapabilities
	if (!Array.isArray(capabilities)) return []

	const results: string[] = []
	for (const c of capabilities) {
		if (typeof c === 'string' && /^(?:arm|x86|i386)/i.test(c)) {
			results.push(c)
		}
	}

	return results
}
