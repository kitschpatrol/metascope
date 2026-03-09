/**
 * CodeMeta JSON metadata source.
 *
 * Reads a codemeta.json file (v1, v2, or v3) and normalizes it into a
 * consistent shape with predictable types. No enrichment, no JSON-LD
 * expansion — just an honest representation of what's in the file.
 *
 * Uses Zod preprocess schemas to handle v1/v2/v3 normalization:
 *   - `@`-prefixed JSON-LD keys stripped, v1 property names remapped
 *   - `{"@type": "xsd:anyURI", "@value": "..."}` unwrapped to plain strings
 *   - Person/org objects normalized (`@type`→`type`, `@id`→`id`, affiliation-as-object)
 *   - Comma-separated strings split to arrays, `{"name":"..."}` objects unwrapped
 *   - Dependencies normalized (string → `{name: string}`)
 */

import is from '@sindresorhus/is'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { nonEmptyString, optionalUrl, parseJsonRecord } from '../utilities/schema-primitives'
import { matchFiles } from './source'

// ─── Preprocess primitives ───────────────────────────────────────────

/**
 * A string that also unwraps `{"@value": "..."}` JSON-LD typed values.
 * Empty/whitespace strings become undefined via `nonEmptyString`.
 */
const codeMetaString = z.preprocess((value) => {
	if (typeof value === 'string') return value
	if (is.plainObject(value) && typeof value['@value'] === 'string') return value['@value']
}, nonEmptyString)

/** Same as codeMetaString but semantically a URL field. */
const codeMetaUrl = z.preprocess((value) => {
	if (typeof value === 'string') return value
	if (is.plainObject(value) && typeof value['@value'] === 'string') return value['@value']
}, optionalUrl)

/**
 * A string array that handles CodeMeta's polymorphic inputs:
 *   - Single comma-separated string → split to array (common in v1)
 *   - Array of strings → pass through
 *   - Array of `{"name":"..."}` objects → extract name strings (e.g. programmingLanguage)
 */
const codeMetaStringArray = z
	.preprocess((value) => {
		if (value === undefined || value === null) return

		if (typeof value === 'string') {
			return value.includes(',')
				? value
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				: [value]
		}

		if (Array.isArray(value)) {
			return value
				.map((item) => {
					if (typeof item === 'string') {
						return item.trim()
					}
					if (is.plainObject(item)) {
						return typeof item.name === 'string' ? item.name.trim() : ''
					}
					log.warn('Invalid type found in codemeta json parser')
					return ''
				})
				.filter((s) => s.length > 0)
		}
	}, z.array(z.string()).optional())
	.optional()

/**
 * License field — preserve as string or string[].
 */
const codeMetaLicense = z
	.preprocess(
		(value) => {
			if (typeof value === 'string') return value
			if (Array.isArray(value)) {
				const filtered = value.filter((l): l is string => typeof l === 'string')
				return filtered.length > 0 ? filtered : undefined
			}
		},
		z.union([z.string(), z.array(z.string())]).optional(),
	)
	.optional()

// ─── Person/Org sub-schema ───────────────────────────────────────────

const codeMetaPersonOrOrgSchema = z.object({
	affiliation: nonEmptyString,
	email: nonEmptyString,
	familyName: nonEmptyString,
	givenName: nonEmptyString,
	id: nonEmptyString,
	name: nonEmptyString,
	type: z.enum(['Organization', 'Person']).optional(),
	url: optionalUrl,
})

/**
 * Preprocess a raw person/org value into a normalized shape.
 * Handles: plain string → {name: string}, `@type`→`type`, `@id`→`id`,
 * affiliation-as-object → affiliation string.
 */
function preprocessPersonOrOrg(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === 'string') {
		return { name: value }
	}

	if (!is.plainObject(value)) {
		return undefined
	}

	const result: Record<string, unknown> = {}

	// Normalize @type → type
	if (typeof value['@type'] === 'string') {
		const rawType = value['@type'].toLowerCase()
		if (rawType === 'person') result.type = 'Person'
		else if (rawType === 'organization') result.type = 'Organization'
	}

	// Normalize @id → id
	if (typeof value['@id'] === 'string') result.id = value['@id']

	// Pass through standard fields
	if (typeof value.name === 'string') result.name = value.name
	if (typeof value.givenName === 'string') result.givenName = value.givenName
	if (typeof value.familyName === 'string') result.familyName = value.familyName
	if (typeof value.email === 'string') result.email = value.email
	if (typeof value.url === 'string') result.url = value.url

	// Normalize affiliation: string or {name: string}
	if (typeof value.affiliation === 'string') {
		result.affiliation = value.affiliation
	} else if (is.plainObject(value.affiliation) && typeof value.affiliation.name === 'string')
		result.affiliation = value.affiliation.name

	// Only return if we have some identifying info
	if (result.name ?? result.givenName ?? result.familyName ?? result.email) {
		return result
	}

	return undefined
}

/**
 * A person/org array that normalizes single values to arrays,
 * and each element through `preprocessPersonOrOrg`.
 */
const codeMetaPersonArray = z
	.preprocess((value) => {
		if (value === undefined || value === null) return

		const items = Array.isArray(value) ? value : [value]
		const normalized = items
			.map((item) => preprocessPersonOrOrg(item))
			.filter((p): p is Record<string, unknown> => p !== undefined)

		return normalized.length > 0 ? normalized : undefined
	}, z.array(codeMetaPersonOrOrgSchema).optional())
	.optional()

// ─── Dependency sub-schema ───────────────────────────────────────────

const codeMetaDependencySchema = z.object({
	identifier: nonEmptyString,
	name: nonEmptyString,
	runtimePlatform: nonEmptyString,
	version: nonEmptyString,
})

/**
 * Preprocess a raw dependency value into a normalized shape.
 * Handles: plain string → {name: string}.
 */
function preprocessDependency(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === 'string') {
		return { name: value }
	}

	if (!is.plainObject(value)) {
		return undefined
	}

	const dep: Record<string, unknown> = {}

	if (typeof value.name === 'string') dep.name = value.name
	if (typeof value.identifier === 'string') dep.identifier = value.identifier
	if (typeof value.version === 'string') dep.version = value.version
	if (typeof value.runtimePlatform === 'string') dep.runtimePlatform = value.runtimePlatform

	if (dep.name ?? dep.identifier) {
		return dep
	}

	return undefined
}

/**
 * A dependency array that normalizes single values to arrays,
 * and each element through `preprocessDependency`.
 */
const codeMetaDependencyArray = z
	.preprocess((value) => {
		if (value === undefined || value === null) return

		const items = Array.isArray(value) ? value : [value]
		const normalized = items
			.map((item) => preprocessDependency(item))
			.filter((d): d is Record<string, unknown> => d !== undefined)

		return normalized.length > 0 ? normalized : undefined
	}, z.array(codeMetaDependencySchema).optional())
	.optional()

// ─── Top-level schema ────────────────────────────────────────────────

const codeMetaJsonDataSchema = z.object({
	applicationCategory: codeMetaString,
	applicationSubCategory: codeMetaString,
	author: codeMetaPersonArray,
	buildInstructions: codeMetaUrl,
	codeRepository: codeMetaUrl,
	continuousIntegration: codeMetaUrl,
	contributor: codeMetaPersonArray,
	copyrightHolder: codeMetaPersonArray,
	copyrightYear: z.preprocess((v) => {
		if (typeof v === 'number') return v
		if (typeof v === 'string') {
			const parsed = Number.parseInt(v, 10)
			return Number.isNaN(parsed) ? undefined : parsed
		}
	}, z.number().optional()),
	dateCreated: codeMetaString,
	dateModified: codeMetaString,
	datePublished: codeMetaString,
	description: codeMetaString,
	developmentStatus: codeMetaString,
	downloadUrl: codeMetaUrl,
	funder: codeMetaPersonArray,
	funding: codeMetaString,
	identifier: codeMetaString,
	installUrl: codeMetaUrl,
	isAccessibleForFree: z.boolean().optional(),
	issueTracker: codeMetaUrl,
	keywords: codeMetaStringArray,
	license: codeMetaLicense,
	maintainer: codeMetaPersonArray,
	name: codeMetaString,
	operatingSystem: codeMetaStringArray,
	programmingLanguage: codeMetaStringArray,
	readme: codeMetaUrl,
	relatedLink: codeMetaLicense,
	releaseNotes: codeMetaString,
	runtimePlatform: codeMetaStringArray,
	softwareHelp: codeMetaUrl,
	softwareRequirements: codeMetaDependencyArray,
	softwareSuggestions: codeMetaDependencyArray,
	softwareVersion: codeMetaString,
	url: codeMetaUrl,
	version: codeMetaString,
})

export type CodeMetaJson = z.infer<typeof codeMetaJsonDataSchema>

export type CodeMetaJsonData = OneOrMany<SourceRecord<CodeMetaJson>> | undefined

// ─── V1 property name mapping ────────────────────────────────────────

/** Map v1 property names to their v2/v3 equivalents. */
const v1PropertyMap: Record<string, string> = {
	agents: 'author',
	contIntegration: 'continuousIntegration',
	depends: 'softwareRequirements',
	suggests: 'softwareSuggestions',
	title: 'name',
}

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * Parse a codemeta.json file, normalizing v1/v2/v3 into a consistent shape.
 */
export function parse(content: string): CodeMetaJson | undefined {
	const raw = parseJsonRecord(content)
	if (!raw) return undefined

	const migrated = migrateV1Properties(raw)

	// DateReleased → datePublished fallback
	if (migrated.datePublished === undefined && typeof migrated.dateReleased === 'string') {
		migrated.datePublished = migrated.dateReleased
	}

	return codeMetaJsonDataSchema.parse(migrated)
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Strip `@`-prefixed JSON-LD keys and remap v1 property names.
 */
function migrateV1Properties(raw: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(raw)) {
		if (key.startsWith('@')) continue
		const mappedKey = v1PropertyMap[key] ?? key
		// Don't overwrite if already set (prefer v2/v3 names)
		if (!(mappedKey in result)) {
			result[mappedKey] = value
		}
	}
	return result
}

// ─── Source ──────────────────────────────────────────────────────────

export const codemetaJsonSource: MetadataSource<'codemetaJson'> = {
	async extract(context: SourceContext): Promise<CodeMetaJsonData> {
		const files = matchFiles(
			context.fileTree,
			context.options.recursive ? ['**/codemeta.json'] : ['codemeta.json'],
		)
		if (files.length === 0) return undefined

		log.debug('Extracting codemeta.json metadata...')
		const results: Array<SourceRecord<CodeMetaJson>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				const data = parse(content)
				if (!data) continue
				results.push({ data, source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'codemetaJson',
	phase: 1,
}
