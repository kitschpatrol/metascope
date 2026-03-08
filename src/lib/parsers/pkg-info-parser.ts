// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed PKG-INFO / METADATA metadata */
export type PkgInfoData = {
	author: null | string
	author_email: null | string
	classifiers: string[]
	description: null | string
	description_content_type: null | string
	download_url: null | string
	home_page: null | string
	keywords: null | string[]
	license: null | string
	long_description: null | string
	maintainer: null | string
	maintainer_email: null | string
	metadata_version: null | string
	name: null | string
	platforms: string[]
	project_urls: Record<string, string>
	requires_dist: string[]
	requires_python: null | string
	summary: null | string
	version: null | string
}

// ─── Header parser ──────────────────────────────────────────────────────────

/** Multi-value headers that can appear multiple times. */
const MULTI_VALUE_HEADERS = new Set([
	'Classifier',
	'Platform',
	'Project-URL',
	'Requires-Dist',
	'Requires-External',
	'Supported-Platform',
])

/**
 * Parse RFC 822-style headers from PKG-INFO / METADATA content.
 * Multi-value headers are collected into newline-separated strings.
 * Stops at the first blank line (which separates headers from body).
 */
function parseHeaders(content: string): Record<string, string> {
	const headers: Record<string, string> = {}
	let lastKey = ''

	for (const line of content.split('\n')) {
		// Blank line = end of headers, start of body
		if (line.trim() === '') break

		// Continuation line (starts with whitespace)
		if (/^\s/.test(line) && lastKey) {
			const continuation = line.trim()
			if (continuation) {
				headers[lastKey] = `${headers[lastKey]}\n${continuation}`
			}

			continue
		}

		// Header line: "Key: Value"
		const colonIndex = line.indexOf(': ')
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex)
			const value = line.slice(colonIndex + 2).trim()

			headers[key] =
				MULTI_VALUE_HEADERS.has(key) && headers[key] ? `${headers[key]}\n${value}` : value

			lastKey = key
		}
	}

	return headers
}

/** Extract body text after the first blank line. */
function extractBody(content: string): null | string {
	const blankIndex = content.indexOf('\n\n')
	if (blankIndex < 0) return null
	const body = content.slice(blankIndex + 2).trim()
	return body || null
}

/** Split newline-separated multi-value into array. */
function splitMulti(value: string | undefined): string[] {
	if (!value) return []
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/** Simple header-to-field mappings. */
const HEADER_MAP: Record<string, keyof PkgInfoData> = {
	'Author': 'author',
	'Author-email': 'author_email',
	'Description-Content-Type': 'description_content_type',
	'Download-URL': 'download_url',
	'Home-Page': 'home_page',
	'Home-page': 'home_page',
	'License': 'license',
	'Maintainer': 'maintainer',
	'Maintainer-email': 'maintainer_email',
	'Metadata-Version': 'metadata_version',
	'Name': 'name',
	'Requires-Python': 'requires_python',
	'Summary': 'summary',
	'Version': 'version',
}

/**
 * Parse a PKG-INFO or METADATA file and return structured metadata.
 *
 * Handles RFC 822-style headers with multi-value fields (Classifier,
 * Requires-Dist, Project-URL, Platform), continuation lines, and
 * the body section as long_description.
 */
export function parsePkgInfo(source: string): PkgInfoData {
	const headers = parseHeaders(source)

	const data: PkgInfoData = {
		author: null,
		author_email: null,
		classifiers: [],
		description: null,
		description_content_type: null,
		download_url: null,
		home_page: null,
		keywords: null,
		license: null,
		long_description: null,
		maintainer: null,
		maintainer_email: null,
		metadata_version: null,
		name: null,
		platforms: [],
		project_urls: {},
		requires_dist: [],
		requires_python: null,
		summary: null,
		version: null,
	}

	// Simple string fields
	for (const [header, field] of Object.entries(HEADER_MAP)) {
		const value = headers[header]
		if (value && value !== 'UNKNOWN') {
			data[field] = value as never
		}
	}

	// Also map Summary → description for convenience
	if (headers.Summary && headers.Summary !== 'UNKNOWN') {
		data.description = headers.Summary
	}

	// Keywords — comma-separated
	if (headers.Keywords && headers.Keywords !== 'UNKNOWN') {
		data.keywords = headers.Keywords.split(',')
			.map((k) => k.trim())
			.filter(Boolean)
	}

	// Classifiers — multi-value
	data.classifiers = splitMulti(headers.Classifier)

	// Platforms — multi-value
	data.platforms = splitMulti(headers.Platform)

	// Requires-Dist — multi-value
	data.requires_dist = splitMulti(headers['Requires-Dist'])

	// Project-URL — multi-value "Label, URL" format
	if (headers['Project-URL']) {
		for (const line of splitMulti(headers['Project-URL'])) {
			const commaIndex = line.indexOf(', ')
			if (commaIndex > 0) {
				const label = line.slice(0, commaIndex).trim()
				const url = line.slice(commaIndex + 2).trim()
				if (url) {
					data.project_urls[label] = url
				}
			}
		}
	}

	// Long description from body
	data.long_description = extractBody(source)

	return data
}
