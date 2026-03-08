/* eslint-disable ts/naming-convention */

import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed PKG-INFO / METADATA metadata */
const pkgInfoDataSchema = z.object({
	author: nonEmptyString,
	author_email: nonEmptyString,
	classifiers: stringArray,
	description: nonEmptyString,
	description_content_type: nonEmptyString,
	download_url: optionalUrl,
	home_page: optionalUrl,
	keywords: z.array(z.string()).optional(),
	license: nonEmptyString,
	long_description: nonEmptyString,
	maintainer: nonEmptyString,
	maintainer_email: nonEmptyString,
	metadata_version: nonEmptyString,
	name: nonEmptyString,
	platforms: stringArray,
	project_urls: z.record(z.string(), z.string()),
	requires_dist: stringArray,
	requires_python: nonEmptyString,
	summary: nonEmptyString,
	version: nonEmptyString,
})

export type PkgInfoData = z.infer<typeof pkgInfoDataSchema>

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
function extractBody(content: string): string | undefined {
	const blankIndex = content.indexOf('\n\n')
	if (blankIndex === -1) return undefined
	const body = content.slice(blankIndex + 2).trim()
	return body || undefined
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
	Author: 'author',
	'Author-email': 'author_email',
	'Description-Content-Type': 'description_content_type',
	'Download-URL': 'download_url',
	'Home-Page': 'home_page',
	'Home-page': 'home_page',
	License: 'license',
	Maintainer: 'maintainer',
	'Maintainer-email': 'maintainer_email',
	'Metadata-Version': 'metadata_version',
	Name: 'name',
	'Requires-Python': 'requires_python',
	Summary: 'summary',
	Version: 'version',
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
		author: undefined,
		author_email: undefined,
		classifiers: [],
		description: undefined,
		description_content_type: undefined,
		download_url: undefined,
		home_page: undefined,
		keywords: undefined,
		license: undefined,
		long_description: undefined,
		maintainer: undefined,
		maintainer_email: undefined,
		metadata_version: undefined,
		name: undefined,
		platforms: [],
		project_urls: {},
		requires_dist: [],
		requires_python: undefined,
		summary: undefined,
		version: undefined,
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

	return pkgInfoDataSchema.parse(data)
}
