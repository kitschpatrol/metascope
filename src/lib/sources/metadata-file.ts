/**
 * Source and parser for custom `metadata.json` / `metadata.yaml` / `metadata.yml` files.
 *
 * This is a simple custom format with synonymous field names for common
 * project metadata. It supports JSON and YAML formats.
 *
 * Field mapping (with fallback chains):
 *   description                                        → description
 *   homepage | url | repository (normalized) | website → homepage
 *   keywords | tags | topics                           → keywords
 *   repository (normalized)                            → repository
 */

import is from '@sindresorhus/is'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import {
	nonEmptyString,
	optionalUrl,
	parseJsonRecord,
	stringArray,
} from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const metadataSchema = z.object({
	/** Project description. */
	description: nonEmptyString,
	/** Project homepage URL (resolved from homepage, url, repository, or website). */
	homepage: optionalUrl,
	/** Keyword list (resolved from keywords, tags, or topics). */
	keywords: stringArray,
	/** Repository URL (normalized, stripped of git+ prefix and .git suffix). */
	repository: optionalUrl,
})

export type Metadata = z.infer<typeof metadataSchema>

export type MetadataFileData = SourceRecord<Metadata> | undefined

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a metadata file content string into a structured object.
 * The `format` parameter determines whether to parse as JSON or YAML.
 * Returns undefined if the content is malformed or not an object.
 */
export function parse(content: string, format: 'json' | 'yaml'): Metadata | undefined {
	let data: Record<string, unknown> | undefined
	if (format === 'json') {
		data = parseJsonRecord(content)
	} else {
		try {
			const parsed: unknown = parseYaml(content)
			data = is.plainObject(parsed) ? parsed : undefined
		} catch {
			return undefined
		}
	}

	if (!data) return undefined

	const repository = isString(data.repository) ? normalizeRepoUrl(data.repository) : undefined

	const homepage =
		nonEmpty(data.homepage) ?? nonEmpty(data.url) ?? repository ?? nonEmpty(data.website)

	const keywords =
		parseKeywords(data.keywords) ?? parseKeywords(data.tags) ?? parseKeywords(data.topics) ?? []

	return metadataSchema.parse({
		description: data.description,
		homepage,
		keywords,
		repository,
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Return a trimmed string if the value is a non-empty string, else undefined. */
function nonEmpty(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/** Type guard for strings. */
function isString(value: unknown): value is string {
	return typeof value === 'string'
}

/** Normalize a repository URL by stripping git+ prefix and .git suffix. */
function normalizeRepoUrl(url: string): string {
	let normalized = url
	if (normalized.startsWith('git+')) {
		normalized = normalized.slice(4)
	}

	if (normalized.endsWith('.git')) {
		normalized = normalized.slice(0, -4)
	}

	return normalized
}

/** Parse keywords from an array of strings or a comma-delimited string. */
function parseKeywords(value: unknown): string[] | undefined {
	if (typeof value === 'string') {
		const parsed = value
			.split(',')
			.map((k) => k.trim())
			.filter(Boolean)
		return parsed.length > 0 ? parsed : undefined
	}

	if (Array.isArray(value)) {
		const strings = value.filter((v): v is string => typeof v === 'string')
		return strings.length > 0 ? strings : undefined
	}

	return undefined
}

// ─── Source ─────────────────────────────────────────────────────────

/** Supported metadata file names in priority order. */
const METADATA_FILES: ReadonlyArray<{ format: 'json' | 'yaml'; name: string }> = [
	{ format: 'json', name: 'metadata.json' },
	{ format: 'yaml', name: 'metadata.yaml' },
	{ format: 'yaml', name: 'metadata.yml' },
]

/**
 * Try to read and identify which metadata file exists in the directory.
 * Returns the content and format of the first found file, or undefined.
 */
async function findMetadataFile(
	directoryPath: string,
): Promise<undefined | { content: string; filePath: string; format: 'json' | 'yaml' }> {
	for (const { format, name } of METADATA_FILES) {
		try {
			const filePath = resolve(directoryPath, name)
			const content = await readFile(filePath, 'utf8')
			return { content, filePath, format }
		} catch {
			// File doesn't exist, try next
		}
	}

	return undefined
}

export const metadataFileSource: MetadataSource<'metadataFile'> = {
	async extract(context: SourceContext): Promise<MetadataFileData> {
		const found = await findMetadataFile(context.path)
		if (!found) return undefined

		log.debug('Extracting metadata file metadata...')
		const data = parse(found.content, found.format)
		if (!data) return undefined
		return { data, source: found.filePath }
	},
	key: 'metadataFile',
	phase: 1,}
