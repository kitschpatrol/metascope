import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { parseProperties } from '../parsers/properties-parser'
import { defineSource } from '../source'
import { nonEmptyString, optionalUrl } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const processingSketchPropertiesAuthorEntrySchema = z.object({
	name: z.string(),
	url: z.string().optional(),
})

const processingSketchPropertiesSchema = z.object({
	// ── Unofficial keys (borrowed from library.properties) ─────────
	/** Parsed author entries with optional URLs. _Unofficial: borrowed from library.properties_ */
	authors: z.array(processingSketchPropertiesAuthorEntrySchema),
	// ── Other observed keys ────────────────────────────────────────
	/** Contributed component type. */
	component: nonEmptyString,
	/** Direct download URL. _Unofficial: borrowed from library.properties_ */
	download: optionalUrl,
	// ── Official keys ──────────────────────────────────────────────
	/** Primary .pde filename for the sketch. */
	main: nonEmptyString,
	// ── Android manifest keys ──────────────────────────────────────
	/** Android app label. From `manifest.label`. */
	manifestLabel: nonEmptyString,
	/** Android screen orientation, e.g. "unspecified". From `manifest.orientation`. */
	manifestOrientation: nonEmptyString,
	/** Android package name. From `manifest.package`. */
	manifestPackage: nonEmptyString,
	/** Android permission list. From `manifest.permissions`. */
	manifestPermissions: z.array(z.string()),
	/** Android minimum SDK level. From `manifest.sdk.min`. */
	manifestSdkMin: z.number().optional(),
	/** Android target SDK level. From `manifest.sdk.target`. */
	manifestSdkTarget: z.number().optional(),
	/** Android version code integer. From `manifest.version.code`. */
	manifestVersionCode: z.number().optional(),
	/** Android version name string. From `manifest.version.name`. */
	manifestVersionName: nonEmptyString,
	/** Maximum Processing revision, or 0 for no upper constraint. _Unofficial: borrowed from library.properties_ */
	maxRevision: z.number(),
	/** Minimum Processing revision, or 0 for no lower constraint. _Unofficial: borrowed from library.properties_ */
	minRevision: z.number(),
	/** Mode display name, e.g. "Java", "REPL Mode". */
	mode: nonEmptyString,
	/** Mode identifier, e.g. "processing.mode.java.JavaMode". From `mode.id`. */
	modeId: nonEmptyString,
	/** Sketch name. _Unofficial: borrowed from library.properties_ */
	name: nonEmptyString,
	/** Extended description paragraph. _Unofficial: borrowed from library.properties_ */
	paragraph: nonEmptyString,
	/** Human-readable version string. _Unofficial: borrowed from library.properties_ */
	prettyVersion: nonEmptyString,
	/** Raw key-value pairs. */
	raw: z.record(z.string(), z.string()),
	/** One-sentence description. _Unofficial: borrowed from library.properties_ */
	sentence: nonEmptyString,
	/** Templates string. */
	templates: nonEmptyString,
	/** Project URL. _Unofficial: borrowed from library.properties_ */
	url: optionalUrl,
	/** Integer release counter. _Unofficial: borrowed from library.properties_ */
	version: z.number(),
	/** Zip file name for contributed content. */
	zipfilename: nonEmptyString,
})

export type ProcessingSketchProperties = z.infer<typeof processingSketchPropertiesSchema>

type ProcessingSketchPropertiesAuthorEntry = ProcessingSketchProperties['authors'][number]

export type ProcessingSketchPropertiesData =
	| OneOrMany<SourceRecord<ProcessingSketchProperties>>
	| undefined

// ─── Parse ──────────────────────────────────────────────────────────

/**
 * Parse a Processing `sketch.properties` content string into a structured object.
 */
export function parse(content: string): ProcessingSketchProperties {
	const raw = parseProperties(content)

	const versionRaw = raw.version ?? '0'
	const versionParsed = Number.parseInt(versionRaw, 10)

	const prettyVersionRaw = raw.prettyVersion
	const prettyVersion = prettyVersionRaw ? stripInlineComment(prettyVersionRaw) : undefined

	const minRevisionRaw = raw.minRevision
	const minParsed = minRevisionRaw ? Number.parseInt(minRevisionRaw, 10) : 0

	const maxRevisionRaw = raw.maxRevision
	const maxParsed = maxRevisionRaw ? Number.parseInt(maxRevisionRaw, 10) : 0

	const manifestVersionCodeRaw = raw['manifest.version.code']
	const manifestVersionCode = manifestVersionCodeRaw
		? Number.parseInt(manifestVersionCodeRaw, 10)
		: undefined

	const manifestSdkTargetRaw = raw['manifest.sdk.target']
	const manifestSdkTarget = manifestSdkTargetRaw
		? Number.parseInt(manifestSdkTargetRaw, 10)
		: undefined

	const manifestSdkMinRaw = raw['manifest.sdk.min']
	const manifestSdkMin = manifestSdkMinRaw ? Number.parseInt(manifestSdkMinRaw, 10) : undefined

	const permissionsRaw = raw['manifest.permissions'] ?? ''
	const manifestPermissions = permissionsRaw
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)

	return processingSketchPropertiesSchema.parse({
		authors: parseAuthors(raw.authors ?? raw.authorList ?? ''),
		component: nonEmpty(raw.component),
		download: nonEmpty(unescapeUrl(raw.download ?? '')),
		main: nonEmpty(raw.main),
		manifestLabel: nonEmpty(raw['manifest.label']),
		manifestOrientation: nonEmpty(raw['manifest.orientation']),
		manifestPackage: nonEmpty(raw['manifest.package']),
		manifestPermissions,
		manifestSdkMin: Number.isNaN(manifestSdkMin) ? undefined : manifestSdkMin,
		manifestSdkTarget: Number.isNaN(manifestSdkTarget) ? undefined : manifestSdkTarget,
		manifestVersionCode: Number.isNaN(manifestVersionCode) ? undefined : manifestVersionCode,
		manifestVersionName: nonEmpty(raw['manifest.version.name']),
		maxRevision: Number.isNaN(maxParsed) ? 0 : maxParsed,
		minRevision: Number.isNaN(minParsed) ? 0 : minParsed,
		mode: nonEmpty(raw.mode),
		modeId: nonEmpty(raw['mode.id']),
		name: nonEmpty(raw.name),
		paragraph: nonEmpty(raw.paragraph),
		prettyVersion: nonEmpty(prettyVersion),
		raw,
		sentence: nonEmpty(raw.sentence),
		templates: nonEmpty(raw.templates),
		url: nonEmpty(unescapeUrl(raw.url ?? '')),
		version: Number.isNaN(versionParsed) ? 0 : versionParsed,
		zipfilename: nonEmpty(raw.zipfilename),
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Return a trimmed string, or undefined if empty/whitespace-only. */
function nonEmpty(value: string | undefined): string | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Strip trailing inline comments from a value.
 * Matches the pattern ` # comment text` (space-hash-space).
 */
function stripInlineComment(value: string): string {
	const index = value.indexOf(' # ')
	return index === -1 ? value : value.slice(0, index).trim()
}

/**
 * Unescape backslash-escaped colons in URLs.
 */
function unescapeUrl(value: string): string {
	return value.replaceAll(String.raw`\:`, ':')
}

// ─── Author parsing ────────────────────────────────────────────────

/**
 * Parse an authors/authorList value into AuthorEntry[].
 */
function parseAuthors(value: string): ProcessingSketchPropertiesAuthorEntry[] {
	const trimmed = value.trim()
	if (trimmed.length === 0) return []

	const results: ProcessingSketchPropertiesAuthorEntry[] = []
	let cursor = 0

	while (cursor < trimmed.length) {
		const bracketStart = trimmed.indexOf('[', cursor)

		if (bracketStart === -1) {
			addPlainAuthors(trimmed.slice(cursor), results)
			break
		}

		if (bracketStart > cursor) {
			addPlainAuthors(trimmed.slice(cursor, bracketStart), results)
		}

		const bracketEnd = trimmed.indexOf(']', bracketStart)
		if (bracketEnd === -1) {
			addPlainAuthors(trimmed.slice(bracketStart), results)
			break
		}

		const parenStart = trimmed.indexOf('(', bracketEnd)
		if (parenStart === -1 || parenStart !== bracketEnd + 1) {
			addPlainAuthors(trimmed.slice(bracketStart, bracketEnd + 1), results)
			cursor = bracketEnd + 1
			continue
		}

		const parenEnd = trimmed.indexOf(')', parenStart)
		if (parenEnd === -1) {
			addPlainAuthors(trimmed.slice(bracketStart), results)
			break
		}

		const namesPart = trimmed.slice(bracketStart + 1, bracketEnd).trim()
		const rawUrl = trimmed.slice(parenStart + 1, parenEnd).trim()
		const url = nonEmpty(unescapeUrl(rawUrl))

		const names = namesPart
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0)
		for (const name of names) {
			results.push({ name, url })
		}

		cursor = parenEnd + 1
	}

	return results
}

/**
 * Split plain text on ` and `, `,`, `&` to extract author names.
 */
function addPlainAuthors(text: string, results: ProcessingSketchPropertiesAuthorEntry[]): void {
	const parts = text
		.split(/\band\b|,|&/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && s.toLowerCase() !== 'others')

	for (const name of parts) {
		results.push({ name, url: undefined })
	}
}

// ─── Availability ───────────────────────────────────────────────────

/**
 * Validate that a sketch.properties file is a Processing sketch.
 * Checks for at least one known Processing sketch key.
 */
function isProcessingSketchProperties(content: string): boolean {
	const raw = parseProperties(content)
	const keys = Object.keys(raw)

	return keys.some(
		(k) => k === 'main' || k === 'mode' || k === 'mode.id' || k.startsWith('manifest.'),
	)
}

export const processingSketchPropertiesSource = defineSource<'processingSketchProperties'>({
	async getInputs(context) {
		return getMatches(context.options, ['sketch.properties'])
	},
	key: 'processingSketchProperties',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		if (!isProcessingSketchProperties(content)) {
			return
		}
		return { data: parse(content), source: input }
	},
	phase: 1,
})
