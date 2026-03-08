/**
 * Parser for custom `metadata.json` / `metadata.yaml` / `metadata.yml` files.
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

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

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

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a metadata file content string into a structured object.
 * The `format` parameter determines whether to parse as JSON or YAML.
 * Returns undefined if the content is malformed or not an object.
 */
export function parseMetadata(content: string, format: 'json' | 'yaml'): Metadata | undefined {
	let data: unknown
	try {
		data = format === 'json' ? JSON.parse(content) : parseYaml(content)
	} catch {
		return undefined
	}

	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return undefined
	}

	const record = data as Record<string, unknown>

	const repository = isString(record.repository) ? normalizeRepoUrl(record.repository) : undefined

	const homepage =
		nonEmpty(record.homepage) ?? nonEmpty(record.url) ?? repository ?? nonEmpty(record.website)

	const keywords =
		parseKeywords(record.keywords) ??
		parseKeywords(record.tags) ??
		parseKeywords(record.topics) ??
		[]

	return metadataSchema.parse({
		description: record.description,
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
