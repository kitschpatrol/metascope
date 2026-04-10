/**
 * License identification using Dice coefficient on bigrams.
 *
 * Compares plain-text license file content against the full SPDX license list
 * to identify the best-matching SPDX license identifier. Returns a standard
 * SPDX license URL (e.g. "https://spdx.org/licenses/MIT").
 *
 * Handles:
 *
 * - Canonical SPDX / vendor URLs embedded in pointer-style license files
 * - Standard license texts (MIT, BSD, Apache, etc.)
 * - GNU family licenses via header pattern matching (LGPL, AGPL)
 * - Markdown-formatted license files (strips headings, tables, links)
 * - YAML front matter stripping
 */

import spdxLicenseList from 'spdx-license-list/full.js'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseMatch = {
	/** Dice coefficient confidence score (0–1). */
	confidence: number
	/** SPDX license identifier (e.g. "MIT", "Apache-2.0"). */
	spdxId: string
	/** SPDX license URL. */
	spdxUrl: string
}

// ─── Constants ──────────────────────────────────────────────────────

const SPDX_BASE_URL = 'https://spdx.org/licenses/'

/** Minimum similarity score to consider a match. */
const CONFIDENCE_THRESHOLD = 0.75

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Identify the SPDX license that best matches the given text. Returns the best
 * match with confidence score, or undefined if no match exceeds the confidence
 * threshold.
 */
export function identifyLicense(text: string): LicenseMatch | undefined {
	// Short circuit for pointer-style license files that only reference
	// a canonical SPDX or vendor URL (e.g. CC license deeds)
	const urlMatch = identifyByUrl(text)
	if (urlMatch) return urlMatch

	// Quick header-based check for GNU licenses whose SPDX templates
	// include combined texts that don't match real-world standalone files
	const headerMatch = identifyByHeader(text)
	if (headerMatch) return headerMatch

	const normalizedInput = normalizeInput(text)

	if (normalizedInput.length < 2) return undefined

	const inputBigramsMap = computeBigrams(normalizedInput)
	const inputTotal = normalizedInput.length - 1

	let bestMatch: LicenseMatch | undefined
	let bestScore = 0

	for (const { bigramsMap, normalized, spdxId, spdxUrl, totalBigrams } of getNormalizedLicenses()) {
		if (normalizedInput === normalized) {
			return { confidence: 1, spdxId, spdxUrl }
		}

		const score = diceCoefficientCached(inputBigramsMap, inputTotal, bigramsMap, totalBigrams)
		if (score > bestScore) {
			bestScore = score
			bestMatch = { confidence: score, spdxId, spdxUrl }
			if (bestScore > 0.98) break
		}
	}

	if (bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
		return bestMatch
	}

	return undefined
}

/**
 * Convert an SPDX license identifier to its canonical SPDX URL.
 */
export function spdxIdToUrl(spdxId: string): string {
	return `${SPDX_BASE_URL}${spdxId}`
}

/**
 * Resolve the canonical URL for an SPDX license ID. Prefers the upstream URL
 * recorded in the SPDX list (e.g. `https://opensource.org/license/mit/`) and
 * falls back to the SPDX registry URL for the handful of entries whose upstream
 * URL is missing at runtime.
 */
function getLicenseUrl(spdxId: string): string {
	// Some actually are undefined?
	// eslint-disable-next-line ts/no-unnecessary-condition
	return spdxLicenseList[spdxId]?.url ?? spdxIdToUrl(spdxId)
}

// ─── Text normalization ─────────────────────────────────────────────

/**
 * Strip YAML front matter (--- delimited blocks at the start of a file).
 */
function stripFrontMatter(text: string): string {
	if (text.startsWith('---')) {
		const end = text.indexOf('---', 3)
		if (end !== -1) {
			return text.slice(end + 3)
		}
	}

	return text
}

/**
 * Normalize license text for comparison. Follows SPDX matching guidelines:
 * collapse whitespace, strip copyright lines, remove URLs, lowercase.
 */
function normalizeText(text: string): string {
	return (
		text
			// Remove markdown headings
			.replaceAll(/^#+\s+/gm, '')
			// Remove copyright lines (they vary per project, may span multiple formats)
			.replaceAll(/^copyright.*$/gim, '')
			// Remove markdown table rows (contributor tables in COPYING files)
			.replaceAll(/^\|.*\|$/gm, '')
			// Remove markdown table separators
			.replaceAll(/^[-|:\s]+$/gm, '')
			// Remove common URL patterns
			.replaceAll(/https?:\/\/\S+/g, '')
			// Remove email-like patterns
			.replaceAll(/\S+@\S+/g, '')
			// Remove markdown link/image syntax leftovers
			.replaceAll(/[[\]()]/g, ' ')
			// Collapse whitespace
			.replaceAll(/\s+/g, ' ')
			.trim()
			.toLowerCase()
	)
}

/**
 * Normalize input text (user-provided license file). Applies additional cleanup
 * beyond what reference texts need.
 */
function normalizeInput(text: string): string {
	return normalizeText(stripFrontMatter(text))
}

// ─── Bigram / Dice coefficient ──────────────────────────────────────

/**
 * Compute bigrams (2-character substrings) of a string.
 */
function computeBigrams(text: string): Map<string, number> {
	const map = new Map<string, number>()
	for (let index = 0; index < text.length - 1; index++) {
		const pair = text.slice(index, index + 2)
		map.set(pair, (map.get(pair) ?? 0) + 1)
	}

	return map
}

/** Pre-computed normalized license texts with cached bigrams, built lazily. */
type NormalizedLicense = {
	bigramsMap: Map<string, number>
	normalized: string
	spdxId: string
	spdxUrl: string
	totalBigrams: number
}

let normalizedLicenses: NormalizedLicense[] | undefined

function getNormalizedLicenses(): NormalizedLicense[] {
	normalizedLicenses ??= Object.entries(spdxLicenseList).map(([spdxId, entry]) => {
		const normalized = normalizeText(entry.licenseText)
		return {
			bigramsMap: computeBigrams(normalized),
			normalized,
			spdxId,
			spdxUrl: getLicenseUrl(spdxId),
			totalBigrams: normalized.length - 1,
		}
	})

	return normalizedLicenses
}

/**
 * Compute the Dice coefficient using pre-computed bigrams for one side.
 */
function diceCoefficientCached(
	inputBigrams: Map<string, number>,
	inputTotal: number,
	referenceBigrams: Map<string, number>,
	referenceTotal: number,
): number {
	let intersection = 0
	for (const [pair, countA] of inputBigrams) {
		const countB = referenceBigrams.get(pair)
		if (countB !== undefined) {
			intersection += Math.min(countA, countB)
		}
	}

	return (2 * intersection) / (inputTotal + referenceTotal)
}

// ─── Header-based matching ──────────────────────────────────────────

/**
 * Title-based identification for GNU licenses whose SPDX templates embed
 * combined texts (e.g. LGPL-3.0-only = LGPL supplement + full GPL), making Dice
 * coefficient unreliable against real-world standalone files. Only checks the
 * first 500 characters to avoid matching references in unrelated license texts
 * (e.g. CeCILL-2.1 mentions AGPL in its body).
 */
const HEADER_PATTERNS: Array<{ pattern: RegExp; spdxId: string }> = [
	{ pattern: /gnu lesser general public license\s+version 3/i, spdxId: 'LGPL-3.0-only' },
	{ pattern: /gnu lesser general public license\s+version 2\.1/i, spdxId: 'LGPL-2.1-only' },
	{
		pattern: /gnu lesser general public license\s+version 2(?:\.0)?(?!\.\d)/i,
		spdxId: 'LGPL-2.0-only',
	},
	{ pattern: /gnu affero general public license\s+version 3/i, spdxId: 'AGPL-3.0-only' },
]

function identifyByHeader(text: string): LicenseMatch | undefined {
	const header = text.slice(0, 500)
	for (const { pattern, spdxId } of HEADER_PATTERNS) {
		if (pattern.test(header)) {
			return { confidence: 1, spdxId, spdxUrl: getLicenseUrl(spdxId) }
		}
	}

	return undefined
}

// ─── URL-based matching ─────────────────────────────────────────────

/**
 * Extracts `http(s)://...` URLs from the raw text, stripping trailing
 * punctuation that commonly follows a URL in prose (`.`, `,`, `)`, `]`, etc.)
 * but is not part of the URL itself.
 */
const URL_REGEX = /https?:\/\/[^\s<>"')\]}]+/gi

/** Leading `www.` subdomain. */
const WWW_PREFIX_REGEX = /^www\./

/** Trailing `/legalcode` or `/legalcode.<ext>` on Creative Commons URLs. */
const LEGALCODE_SUFFIX_REGEX = /\/legalcode(?:\.[a-z]+)?$/

/** Trailing slashes. */
const TRAILING_SLASH_REGEX = /\/+$/

/** Trailing prose punctuation after a URL extracted from text. */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?]+$/

/**
 * Normalize a URL for comparison: lowercase host+path, drop scheme, strip
 * `www.`, strip trailing slashes, and strip trailing `/legalcode(.ext)?`
 * suffixes used by Creative Commons canonical URLs.
 */
function normalizeUrl(url: string): string | undefined {
	let parsed: URL
	try {
		parsed = new URL(url.trim())
	} catch {
		return undefined
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined

	const host = parsed.hostname.toLowerCase().replace(WWW_PREFIX_REGEX, '')
	let path = parsed.pathname.toLowerCase().replace(LEGALCODE_SUFFIX_REGEX, '')
	path = path.replace(TRAILING_SLASH_REGEX, '')
	return `${host}${path}`
}

/**
 * Rank an SPDX ID by how "current" its form is, higher is preferred. Used to
 * break ties when multiple IDs share a canonical URL.
 */
function scoreSpdxId(id: string): number {
	if (id.endsWith('+')) return 0 // Deprecated `+` syntax
	if (id.endsWith('-only')) return 3
	if (id.endsWith('-or-later')) return 2
	return 1 // Bare version, e.g. `GPL-3.0` (also deprecated but still valid)
}

/**
 * When multiple SPDX IDs share a canonical URL (typically deprecated legacy
 * forms alongside current `-only` / `-or-later` variants), pick the current
 * non-deprecated form.
 */
function preferSpdxId(a: string, b: string): string {
	const sa = scoreSpdxId(a)
	const sb = scoreSpdxId(b)
	if (sa !== sb) return sa > sb ? a : b
	return a < b ? a : b
}

/** Lazy index of normalized URL → preferred SPDX ID. */
let urlIndex: Map<string, string> | undefined

function getUrlIndex(): Map<string, string> {
	if (urlIndex) return urlIndex

	const index = new Map<string, string>()

	for (const [spdxId, entry] of Object.entries(spdxLicenseList)) {
		// Always include the canonical spdx.org URL for every listed ID
		index.set(`spdx.org/licenses/${spdxId.toLowerCase()}`, spdxId)

		if (!entry.url) continue
		const normalized = normalizeUrl(entry.url)
		if (!normalized) continue

		const existing = index.get(normalized)
		index.set(normalized, existing ? preferSpdxId(existing, spdxId) : spdxId)
	}

	urlIndex = index
	return index
}

function identifyByUrl(text: string): LicenseMatch | undefined {
	const matches = text.match(URL_REGEX)
	if (!matches) return undefined

	const index = getUrlIndex()
	for (const raw of matches) {
		const cleaned = raw.replace(TRAILING_PUNCTUATION_REGEX, '')
		const normalized = normalizeUrl(cleaned)
		if (!normalized) continue

		const spdxId = index.get(normalized)
		if (spdxId) return { confidence: 1, spdxId, spdxUrl: getLicenseUrl(spdxId) }
	}

	return undefined
}
