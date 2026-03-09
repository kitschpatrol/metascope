/* eslint-disable ts/naming-convention */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import {
	extractRfc822Body,
	parseRfc822Headers,
	splitMultiValues,
} from '../parsers/rfc822-header-parser'
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

export type PkgInfo = z.infer<typeof pkgInfoDataSchema>

export type PythonPkgInfoData = SourceRecord<PkgInfo> | undefined

// ─── Header-to-field mapping ─────────────────────────────────────────────────

/** Simple header-to-field mappings. */
const HEADER_MAP: Record<string, keyof PkgInfo> = {
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

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a PKG-INFO or METADATA file and return structured metadata.
 *
 * Handles RFC 822-style headers with multi-value fields (Classifier,
 * Requires-Dist, Project-URL, Platform), continuation lines, and
 * the body section as long_description.
 */
export function parse(source: string): PkgInfo {
	const headers = parseRfc822Headers(source)

	const data: PkgInfo = {
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
			Object.assign(data, { [field]: value })
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
	data.classifiers = splitMultiValues(headers.Classifier)

	// Platforms — multi-value
	data.platforms = splitMultiValues(headers.Platform)

	// Requires-Dist — multi-value
	data.requires_dist = splitMultiValues(headers['Requires-Dist'])

	// Project-URL — multi-value "Label, URL" format
	if (headers['Project-URL']) {
		for (const line of splitMultiValues(headers['Project-URL'])) {
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
	data.long_description = extractRfc822Body(source)

	return pkgInfoDataSchema.parse(data)
}

// ─── Source ──────────────────────────────────────────────────────────────────

/** Find a `PKG-INFO` file in a directory. */
async function findPkgInfoFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const pkgInfo = entries.find((entry) => entry === 'PKG-INFO')
		if (pkgInfo) return resolve(directoryPath, pkgInfo)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const pythonPkgInfoSource: MetadataSource<'pythonPkgInfo'> = {
	async extract(context: SourceContext): Promise<PythonPkgInfoData> {
		log.debug('Extracting PKG-INFO metadata...')

		const filePath = await findPkgInfoFile(context.path)
		if (!filePath) return undefined

		const content = await readFile(filePath, 'utf8')
		const data = parse(content)
		return { data, source: filePath }
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findPkgInfoFile(context.path)
		return filePath !== undefined
	},
	key: 'pythonPkgInfo',
}
