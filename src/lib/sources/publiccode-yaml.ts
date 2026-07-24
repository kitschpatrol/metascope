/* eslint-disable max-depth */
/* eslint-disable complexity */

/**
 * Source and parser for `publiccode.yml` / `publiccode.yaml` files.
 *
 * Publiccode.yml is a metadata standard for public software repositories,
 * primarily used in Europe (Italy, Netherlands, etc.). See:
 * https://yml.publiccode.tools/
 *
 * Extracts project metadata including name, version, license, contacts,
 * multi-language descriptions, dependencies, and categorization.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source.js'
import { getMatches } from '../file-matching.js'
import { defineSource } from '../source.js'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

// ─── Schema ─────────────────────────────────────────────────────────

const publiccodeContactEntrySchema = z.object({
	affiliation: z.string().optional(),
	email: z.string().optional(),
	name: z.string(),
	phone: z.string().optional(),
})

const publiccodeContractorEntrySchema = z.object({
	name: z.string(),
	until: z.string().optional(),
	website: z.string().optional(),
})

const publiccodeDependencyEntrySchema = z.object({
	category: z.enum(['hardware', 'open', 'proprietary']),
	name: z.string(),
	optional: z.boolean().optional(),
	version: z.string().optional(),
	versionMax: z.string().optional(),
	versionMin: z.string().optional(),
})

const publiccodeDescriptionSchema = z.object({
	documentation: z.string().optional(),
	features: z.array(z.string()),
	genericName: z.string().optional(),
	localisedName: z.string().optional(),
	longDescription: z.string().optional(),
	shortDescription: z.string().optional(),
})

const publiccodeSchema = z.object({
	/** Application suite this software belongs to. */
	applicationSuite: nonEmptyString,
	/** Available localization languages (BCP 47). */
	availableLanguages: stringArray,
	/** Software categories (e.g. "it-security", "cloud-management"). */
	categories: stringArray,
	/** Maintenance contacts. */
	contacts: z.array(publiccodeContactEntrySchema),
	/** Maintenance contractors. */
	contractors: z.array(publiccodeContractorEntrySchema),
	/** Software dependencies (open, proprietary, hardware). */
	dependencies: z.array(publiccodeDependencyEntrySchema),
	/** Preferred description (English if available, else first language). */
	description: publiccodeDescriptionSchema.optional(),
	/** All localized descriptions keyed by language code. */
	descriptions: z.record(z.string(), publiccodeDescriptionSchema),
	/** Development status (concept, development, beta, stable, obsolete). */
	developmentStatus: nonEmptyString,
	/** Supported input MIME types. */
	inputTypes: stringArray,
	/** URL of upstream software this is based on. */
	isBasedOn: optionalUrl,
	/** Landing page URL. */
	landingUrl: optionalUrl,
	/** SPDX license expression. */
	license: nonEmptyString,
	/** Whether the software supports localization. */
	localisationReady: z.boolean().optional(),
	/** Path or URL to logo image. */
	logo: optionalUrl,
	/** Main copyright holder. */
	mainCopyrightOwner: nonEmptyString,
	/** Maintenance type (internal, community, contract, none). */
	maintenanceType: nonEmptyString,
	/** Path or URL to monochrome logo image. */
	monochromeLogo: optionalUrl,
	/** Software name. */
	name: nonEmptyString,
	/** Supported output MIME types. */
	outputTypes: stringArray,
	/** Supported platforms (e.g. "web", "linux", "mac"). */
	platforms: stringArray,
	/** The publiccode.yml schema version. */
	publiccodeYmlVersion: nonEmptyString,
	/** Release date (YYYY-MM-DD). */
	releaseDate: nonEmptyString,
	/** Repository owner name. */
	repoOwner: nonEmptyString,
	/** Roadmap URL. */
	roadmap: optionalUrl,
	/** Software type (e.g. "standalone/web", "standalone/other"). */
	softwareType: nonEmptyString,
	/** Software version string. */
	softwareVersion: nonEmptyString,
	/** Repository URL. */
	url: optionalUrl,
	/** Organizations using this software. */
	usedBy: stringArray,
})

export type Publiccode = z.infer<typeof publiccodeSchema>

export type PubliccodeYamlData = OneOrMany<SourceRecord<Publiccode>> | undefined

type PubliccodeContactEntry = Publiccode['contacts'][number]
type PubliccodeContractorEntry = Publiccode['contractors'][number]
type PubliccodeDependencyEntry = Publiccode['dependencies'][number]
type PubliccodeDescription = NonNullable<Publiccode['description']>

// ─── Helpers ─────────────────────────────────────────────────────────

/** Coerce YAML values that may be parsed as non-strings back to strings. */
function toString(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value
	}

	if (typeof value === 'number') {
		return String(value)
	}

	if (value instanceof Date) {
		return value.toISOString().slice(0, 10)
	}

	return undefined
}

/** Check if a value is a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

/** Check if a value is a plain object (not null, not array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
	)
}

/** Extract string array from a YAML value, filtering non-strings. */
function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return []
	}

	return value.filter((item): item is string => typeof item === 'string')
}

/** Parse a single dependency entry, returning undefined when it lacks a name. */
function parseDependencyEntry(
	dependency: unknown,
	category: PubliccodeDependencyEntry['category'],
): PubliccodeDependencyEntry | undefined {
	if (!isPlainObject(dependency) || !isNonEmptyString(dependency.name)) {
		return undefined
	}

	const entry: PubliccodeDependencyEntry = {
		category,
		name: dependency.name,
	}

	const version = toString(dependency.version)
	if (version !== undefined && version !== '') {
		entry.version = version
	}

	const versionMin = toString(dependency.versionMin)
	if (versionMin !== undefined && versionMin !== '') {
		entry.versionMin = versionMin
	}

	const versionMax = toString(dependency.versionMax)
	if (versionMax !== undefined && versionMax !== '') {
		entry.versionMax = versionMax
	}

	if (typeof dependency.optional === 'boolean') {
		entry.optional = dependency.optional
	}

	return entry
}

/** Parse a description block from a publiccode description object. */
function parseDescription(data: Record<string, unknown>): PubliccodeDescription {
	const features: string[] = []
	if (Array.isArray(data.features)) {
		for (const feature of data.features) {
			if (typeof feature === 'string') {
				features.push(feature)
			} else if (isPlainObject(feature)) {
				// YAML may parse "key: value" strings as objects
				for (const [key, value] of Object.entries(feature)) {
					features.push(typeof value === 'string' ? `${key}: ${value}` : key)
				}
			}
		}
	}

	return {
		...(isNonEmptyString(data.documentation) && { documentation: data.documentation }),
		features,
		...(isNonEmptyString(data.genericName) && { genericName: data.genericName }),
		...(isNonEmptyString(data.localisedName) && { localisedName: data.localisedName }),
		...(isNonEmptyString(data.longDescription) && { longDescription: data.longDescription.trim() }),
		...(isNonEmptyString(data.shortDescription) && {
			shortDescription: data.shortDescription.trim(),
		}),
	}
}

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * Parse a publiccode.yml / publiccode.yaml file content.
 *
 * @param content - Raw YAML file content.
 *
 * @returns Parsed publiccode metadata, or `undefined` if the content is
 *   invalid.
 */
export function parse(content: string): Publiccode | undefined {
	let data: unknown
	try {
		data = parseYaml(content)
	} catch {
		return undefined
	}

	if (!isPlainObject(data)) {
		return undefined
	}

	// Basic validation: must have at least a name or url
	if (!isNonEmptyString(data.name) && !isNonEmptyString(data.url)) {
		return undefined
	}

	// ─── Descriptions ──────────────────────────────────────────
	const descriptions: Record<string, PubliccodeDescription> = {}
	let description: PubliccodeDescription | undefined

	if (isPlainObject(data.description)) {
		const descObject = data.description
		for (const [lang, langData] of Object.entries(descObject)) {
			if (isPlainObject(langData)) {
				descriptions[lang] = parseDescription(langData)
			}
		}

		// Prefer English, fall back to first available language
		const preferredLang = 'en' in descriptions ? 'en' : Object.keys(descriptions)[0]
		if (preferredLang !== undefined && preferredLang !== '') {
			description = descriptions[preferredLang]
		}
	}

	// ─── Contacts ──────────────────────────────────────────────
	const contacts: PubliccodeContactEntry[] = []
	if (isPlainObject(data.maintenance)) {
		const { maintenance } = data
		if (Array.isArray(maintenance.contacts)) {
			for (const contact of maintenance.contacts) {
				if (!isPlainObject(contact) || !isNonEmptyString(contact.name)) {
					continue
				}

				const entry: PubliccodeContactEntry = { name: contact.name }
				if (isNonEmptyString(contact.email)) {
					entry.email = contact.email
				}

				if (isNonEmptyString(contact.phone)) {
					entry.phone = contact.phone
				}

				if (isNonEmptyString(contact.affiliation)) {
					entry.affiliation = contact.affiliation
				}

				contacts.push(entry)
			}
		}
	}

	// ─── Contractors ───────────────────────────────────────────
	const contractors: PubliccodeContractorEntry[] = []
	if (isPlainObject(data.maintenance)) {
		const { maintenance } = data
		if (Array.isArray(maintenance.contractors)) {
			for (const contractor of maintenance.contractors) {
				if (!isPlainObject(contractor) || !isNonEmptyString(contractor.name)) {
					continue
				}

				const entry: PubliccodeContractorEntry = { name: contractor.name }
				const until = toString(contractor.until)
				if (until !== undefined && until !== '') {
					entry.until = until
				}

				if (isNonEmptyString(contractor.website)) {
					entry.website = contractor.website
				}

				contractors.push(entry)
			}
		}
	}

	// ─── Dependencies ──────────────────────────────────────────
	const dependencies: PubliccodeDependencyEntry[] = []
	if (isPlainObject(data.dependsOn)) {
		const { dependsOn } = data
		const dependencyCategories: Array<PubliccodeDependencyEntry['category']> = [
			'open',
			'proprietary',
			'hardware',
		]
		for (const category of dependencyCategories) {
			const categoryDependencies = dependsOn[category]
			if (Array.isArray(categoryDependencies)) {
				for (const dependency of categoryDependencies) {
					const entry = parseDependencyEntry(dependency, category)
					if (entry !== undefined) {
						dependencies.push(entry)
					}
				}
			}
		}
	}

	// ─── Localisation ──────────────────────────────────────────
	let availableLanguages: string[] = []
	let localisationReady: boolean | undefined
	if (isPlainObject(data.localisation)) {
		const loc = data.localisation
		availableLanguages = toStringArray(loc.availableLanguages)
		if (typeof loc.localisationReady === 'boolean') {
			localisationReady = loc.localisationReady
		}
	}

	// ─── Legal ─────────────────────────────────────────────────
	let license: string | undefined
	let mainCopyrightOwner: string | undefined
	let repoOwner: string | undefined
	if (isPlainObject(data.legal)) {
		const { legal } = data
		if (isNonEmptyString(legal.license)) {
			license = legal.license
		}

		if (isNonEmptyString(legal.mainCopyrightOwner)) {
			mainCopyrightOwner = legal.mainCopyrightOwner
		}

		if (isNonEmptyString(legal.repoOwner)) {
			repoOwner = legal.repoOwner
		}
	}

	// ─── Assemble result ───────────────────────────────────────
	const version = toString(data.softwareVersion)
	const releaseDate = toString(data.releaseDate)
	const publiccodeYmlVersion = toString(data.publiccodeYmlVersion)

	return publiccodeSchema.parse({
		...(isNonEmptyString(data.applicationSuite) && { applicationSuite: data.applicationSuite }),
		availableLanguages,
		categories: toStringArray(data.categories),
		contacts,
		contractors,
		dependencies,
		...(description && { description }),
		descriptions,
		...(isNonEmptyString(data.developmentStatus) && { developmentStatus: data.developmentStatus }),
		inputTypes: toStringArray(data.inputTypes),
		...(isNonEmptyString(data.isBasedOn) && { isBasedOn: data.isBasedOn }),
		...(isNonEmptyString(data.landingURL) && { landingUrl: data.landingURL }),
		...(license !== undefined && { license }),
		...(localisationReady !== undefined && { localisationReady }),
		...(isNonEmptyString(data.logo) && { logo: data.logo }),
		...(mainCopyrightOwner !== undefined && { mainCopyrightOwner }),
		...(isPlainObject(data.maintenance) &&
			isNonEmptyString(data.maintenance.type) && { maintenanceType: data.maintenance.type }),
		...(isNonEmptyString(data.monochromeLogo) && { monochromeLogo: data.monochromeLogo }),
		...(isNonEmptyString(data.name) && { name: data.name }),
		outputTypes: toStringArray(data.outputTypes),
		platforms: toStringArray(data.platforms),
		...(publiccodeYmlVersion !== undefined &&
			publiccodeYmlVersion !== '' && { publiccodeYmlVersion }),
		...(releaseDate !== undefined && releaseDate !== '' && { releaseDate }),
		...(repoOwner !== undefined && { repoOwner }),
		...(isNonEmptyString(data.roadmap) && { roadmap: data.roadmap }),
		...(isNonEmptyString(data.softwareType) && { softwareType: data.softwareType }),
		...(version !== undefined && version !== '' && { softwareVersion: version }),
		...(isNonEmptyString(data.url) && { url: data.url }),
		usedBy: toStringArray(data.usedBy),
	})
}

// ─── Source ──────────────────────────────────────────────────────────

export const publiccodeYamlSource = defineSource<'publiccodeYaml'>({
	async discover(context) {
		return getMatches(context.options, ['publiccode.yml', 'publiccode.yaml'])
	},
	key: 'publiccodeYaml',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const data = parse(content)
		return data === undefined ? undefined : { data, source: input }
	},
	phase: 1,
})
