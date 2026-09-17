/**
 * License identification using Dice coefficient on bigrams.
 *
 * Compares license files against compact, precomputed SPDX fingerprints.
 * Similarity is separate from whether the normalized text matches exactly. The
 * original license texts are only needed when generating the corpus.
 *
 * Handles:
 *
 * - Canonical SPDX / vendor URLs embedded in pointer-style license files
 * - Standard license texts (MIT, BSD, Apache, etc.)
 * - GNU family licenses via header pattern matching (LGPL, AGPL)
 * - Markdown-formatted license files (strips headings, tables, links)
 * - YAML front matter stripping
 */

import licenseUrls from '../data/license-urls.json' with { type: 'json' }
import {
	computeLicenseBigrams,
	computeLicenseWordSignature,
	hashLicenseText,
	licenseDiceScore,
	licenseWordScore,
	normalizeLicenseText,
} from './license-fingerprint'
import { getLicenseFingerprints } from './license-fingerprint-data'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseMatch = {
	/**
	 * Character-bigram Dice similarity (0–1), not a probability. References use
	 * 1.
	 */
	confidence: number
	/** Full license name (e.g. "MIT License", "Apache License 2.0"). */
	name: string
	/** Whether the license is OSI approved. */
	osiApproved: boolean
	/** SPDX license identifier (e.g. "MIT", "Apache-2.0"). */
	spdxId: string
	/** SPDX license URL. */
	spdxUrl: string
	/**
	 * Exact normalized text, explicit reference, likely modified text, or an
	 * uncertain candidate.
	 */
	status: 'exact' | 'modified' | 'reference' | 'uncertain'
}

// ─── Constants ──────────────────────────────────────────────────────

const SPDX_BASE_URL = 'https://spdx.org/licenses/'

/** Leading `www.` subdomain. */
const WWW_PREFIX_REGEX = /^www\./v

/** Direct URLs resolved by the explicit `update-license-urls` content step. */
const directLicenseUrls = new Map(
	Object.entries(licenseUrls).map(([spdxId, entry]) => [spdxId, entry.url]),
)

/** Minimum similarity score to consider a match. */
const CONFIDENCE_THRESHOLD = 0.75

const REFERENCE_PREFIX_REGEX =
	/^(?:(?:this (?:work|software|project) is )?licensed under(?: the)?|see)\s*/v
const REFERENCE_SUFFIX_REGEX = /\s*for (?:the )?full text$/v

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Identify a reference license and report whether its normalized text matches
 * exactly. Fuzzy matches require at least 0.75 character similarity; URL and
 * GNU title fallbacks may score lower and are always uncertain. Returns
 * undefined when no candidate or explicit URL reference can be identified.
 */
export function identifyLicense(text: string): LicenseMatch | undefined {
	const normalized = normalizeInput(text)
	const hash = hashLicenseText(normalized)
	const fingerprints = getLicenseFingerprints()
	let exactId: string | undefined
	for (const entry of fingerprints) {
		if (entry.hash === hash) {
			exactId = exactId === undefined ? entry.spdxId : preferSpdxId(exactId, entry.spdxId)
		}
	}

	if (exactId !== undefined) {
		return buildMatch(exactId, 1, 'exact')
	}

	// A URL is sufficient for a short, explicit pointer. It must not override
	// evidence of changed terms in a full license body.
	const reference = identifyByUrl(text)
	if (reference && isLicenseReference(text, reference)) {
		return reference
	}

	if (normalized.length < 2) {
		return undefined
	}

	const inputBigrams = computeLicenseBigrams(normalized)
	// Group identical templates so deprecated aliases do not create a false
	// ambiguity. Score every distinct template; a 0.98 early exit can miss a
	// closer license later in the corpus.
	const candidates = new Map<
		string,
		{ confidence: number; spdxId: string; wordSignature: number[] }
	>()
	for (const entry of fingerprints) {
		const existing = candidates.get(entry.hash)
		if (existing) {
			existing.spdxId = preferSpdxId(existing.spdxId, entry.spdxId)
			continue
		}

		candidates.set(entry.hash, {
			confidence: licenseDiceScore(
				inputBigrams,
				normalized.length - 1,
				entry.bigrams,
				entry.totalBigrams,
			),
			spdxId: entry.spdxId,
			wordSignature: entry.wordSignature,
		})
	}

	const inputWords = computeLicenseWordSignature(normalized)
	const ranked = candidates
		.values()
		.filter((candidate) => candidate.confidence >= CONFIDENCE_THRESHOLD)
		.toArray()
		.toSorted((a, b) => b.confidence - a.confidence)
		.slice(0, 8)
		.map((candidate) => {
			const wordScore = licenseWordScore(inputWords, candidate.wordSignature)
			return { ...candidate, rank: (candidate.confidence + wordScore) / 2, wordScore }
		})
		.toSorted((a, b) => b.rank - a.rank)
	const best = ranked[0]
	if (best) {
		const margin = best.rank - (ranked[1]?.rank ?? 0)
		if (best.confidence >= 0.9 && best.wordScore >= 0.85 && margin >= 0.01) {
			return buildMatch(best.spdxId, best.confidence, 'modified')
		}
	}

	// Extended notices, translated text, and GNU supplements may score poorly
	// against a full template. Prefer their explicit hints over a weak lexical
	// guess, without treating a referenced license as confirmed.
	const hintId = reference?.spdxId ?? identifyByHeader(text)
	const hint = fingerprints.find((entry) => entry.spdxId === hintId)
	if (hint) {
		return buildMatch(
			hint.spdxId,
			licenseDiceScore(inputBigrams, normalized.length - 1, hint.bigrams, hint.totalBigrams),
			'uncertain',
		)
	}

	return best === undefined ? undefined : buildMatch(best.spdxId, best.confidence, 'uncertain')
}

/** Accept explicit license pointers, excluding extra conditions and negations. */
function isLicenseReference(text: string, match: LicenseMatch): boolean {
	if (text.length > 500) {
		return false
	}

	const target = normalizeReferenceWords(text)
		.replace(REFERENCE_PREFIX_REGEX, '')
		.replace(REFERENCE_SUFFIX_REGEX, '')
		.trim()
	const compact = target.replaceAll(' ', '')
	return (
		compact === '' ||
		compact === normalizeReferenceWords(match.name).replaceAll(' ', '') ||
		compact === normalizeReferenceWords(match.spdxId).replaceAll(' ', '')
	)
}

function normalizeReferenceWords(value: string): string {
	return normalizeInput(value)
		.replaceAll(/[^\p{L}\p{N}\s]/gv, ' ')
		.replaceAll(/\blicense\b/gv, '')
		.replaceAll(/\s+/gv, ' ')
		.trim()
}

/**
 * Build a LicenseMatch for the given SPDX ID with the supplied confidence.
 */
function buildMatch(
	spdxId: string,
	confidence: number,
	status: LicenseMatch['status'],
): LicenseMatch {
	const entry = getLicenseFingerprints().find((entry) => entry.spdxId === spdxId)
	if (entry === undefined) {
		throw new Error(`Unknown SPDX license ID "${spdxId}"`)
	}

	return {
		confidence,
		name: entry.name,
		osiApproved: entry.osiApproved,
		spdxId,
		spdxUrl: getLicenseUrl(spdxId),
		status,
	}
}

/**
 * Convert an SPDX license identifier to its canonical SPDX URL.
 */
export function spdxIdToUrl(spdxId: string): string {
	return `${SPDX_BASE_URL}${spdxId}`
}

/**
 * Resolve an audited HTTPS URL for an SPDX license ID from the checked-in URL
 * audit. Falls back to the stable SPDX registry URL for IDs missing from the
 * generated data.
 */
function getLicenseUrl(spdxId: string): string {
	const fallback = spdxIdToUrl(spdxId)
	return directLicenseUrls.get(spdxId) ?? fallback
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

/** Normalize file input using the same rules as the build-time corpus. */
function normalizeInput(text: string): string {
	return normalizeLicenseText(stripFrontMatter(text))
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
	{ pattern: /gnu lesser general public license\s+version 3/iv, spdxId: 'LGPL-3.0-only' },
	{ pattern: /gnu lesser general public license\s+version 2\.1/iv, spdxId: 'LGPL-2.1-only' },
	{
		pattern: /gnu lesser general public license\s+version 2(?:\.0)?(?!\.\d)/iv,
		spdxId: 'LGPL-2.0-only',
	},
	{ pattern: /gnu affero general public license\s+version 3/iv, spdxId: 'AGPL-3.0-only' },
]

function identifyByHeader(text: string): string | undefined {
	const header = text.slice(0, 500)
	for (const { pattern, spdxId } of HEADER_PATTERNS) {
		if (pattern.test(header)) {
			return spdxId
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
const URL_REGEX = /https?:\/\/[^\s<>"'\)\]\}]+/giv

/** Trailing `/legalcode` or `/legalcode.<ext>` on Creative Commons URLs. */
const LEGALCODE_SUFFIX_REGEX = /\/legalcode(?:\.[a-z]+)?$/v

/** Trailing slashes. */
const TRAILING_SLASH_REGEX = /\/+$/v

/** Trailing prose punctuation after a URL extracted from text. */
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?]+$/v

/**
 * Normalize a URL for comparison: lowercase host+path, drop scheme, strip
 * `www.`, strip trailing slashes, and strip trailing `/legalcode(.ext)?`
 * suffixes used by Creative Commons canonical URLs.
 */
function normalizeUrl(url: string | undefined): string | undefined {
	if (url === undefined || url === '') {
		return undefined
	}

	let parsed: URL
	try {
		parsed = new URL(url.trim())
	} catch {
		return undefined
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return undefined
	}

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
	if (id.endsWith('+')) {
		return 0
	} // Deprecated `+` syntax

	if (id.endsWith('-only')) {
		return 3
	}

	if (id.endsWith('-or-later')) {
		return 2
	}

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
	if (sa !== sb) {
		return sa > sb ? a : b
	}

	return a < b ? a : b
}

/** Lazy index of normalized URL → preferred SPDX ID. */
let urlIndex: Map<string, string> | undefined

function getUrlIndex(): Map<string, string> {
	if (urlIndex) {
		return urlIndex
	}

	const index = new Map<string, string>()

	for (const { spdxId, url } of getLicenseFingerprints()) {
		// Always include the canonical spdx.org URL for every listed ID
		index.set(`spdx.org/licenses/${spdxId.toLowerCase()}`, spdxId)
		indexLicenseUrls(index, spdxId, url)
	}

	urlIndex = index
	return index
}

/**
 * Add every normalized form of a license's URLs to the index, keeping the
 * preferred SPDX ID when several IDs share a URL.
 */
function indexLicenseUrls(
	index: Map<string, string>,
	spdxId: string,
	upstreamUrl: string | undefined,
): void {
	// Match both the dependency's original upstream URL and the direct URL
	// metascope emits after canonicalizing it.
	const candidates = new Set([getLicenseUrl(spdxId), upstreamUrl])
	for (const candidate of candidates) {
		const normalized = normalizeUrl(candidate)
		if (normalized === undefined || normalized === '') {
			continue
		}

		const existing = index.get(normalized)
		index.set(normalized, existing === undefined ? spdxId : preferSpdxId(existing, spdxId))
	}
}

function identifyByUrl(text: string): LicenseMatch | undefined {
	const matches = text.match(URL_REGEX)
	if (!matches) {
		return undefined
	}

	const index = getUrlIndex()
	let found: string | undefined
	for (const raw of matches) {
		const cleaned = raw.replace(TRAILING_PUNCTUATION_REGEX, '')
		const normalized = normalizeUrl(cleaned)
		if (normalized === undefined || normalized === '') {
			continue
		}

		const spdxId = index.get(normalized)
		if (spdxId !== undefined && spdxId !== '') {
			if (found !== undefined && found !== spdxId) {
				return undefined
			}

			found = spdxId
		}
	}

	return found === undefined ? undefined : buildMatch(found, 1, 'reference')
}
