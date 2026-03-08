/**
 * Parser for `publiccode.yml` / `publiccode.yaml` files.
 *
 * Publiccode.yml is a metadata standard for public software repositories,
 * primarily used in Europe (Italy, Netherlands, etc.).
 * See: https://yml.publiccode.tools/
 *
 * Extracts project metadata including name, version, license, contacts,
 * multi-language descriptions, dependencies, and categorization.
 */

import { parse as parseYaml } from 'yaml'

// ─── Types ──────────────────────────────────────────────────────────

/** A maintenance contact entry from a publiccode file. */
export type PubliccodeContactEntry = {
	/** Organization or affiliation. */
	affiliation?: string
	/** Email address. */
	email?: string
	/** Person display name. */
	name: string
	/** Phone number. */
	phone?: string
}

/** A contractor entry from a publiccode file. */
export type PubliccodeContractorEntry = {
	/** Contractor display name. */
	name: string
	/** End date of contract (YYYY-MM-DD). */
	until?: string
	/** Contractor website URL. */
	website?: string
}

/** A dependency entry from a publiccode file. */
export type PubliccodeDependencyEntry = {
	/** Dependency category. */
	category: 'hardware' | 'open' | 'proprietary'
	/** Dependency name. */
	name: string
	/** Whether the dependency is optional. */
	optional?: boolean
	/** Exact version requirement. */
	version?: string
	/** Maximum version requirement. */
	versionMax?: string
	/** Minimum version requirement. */
	versionMin?: string
}

/** A localized description block from a publiccode file. */
export type PubliccodeDescription = {
	/** URL to documentation. */
	documentation?: string
	/** Feature list. */
	features: string[]
	/** Generic software category name. */
	genericName?: string
	/** Localized software name. */
	localisedName?: string
	/** Full description text. */
	longDescription?: string
	/** Brief one-line description. */
	shortDescription?: string
}

/** Parsed publiccode.yml / publiccode.yaml metadata. */
export type Publiccode = {
	/** Application suite this software belongs to. */
	applicationSuite?: string
	/** Available localization languages (BCP 47). */
	availableLanguages: string[]
	/** Software categories (e.g. "it-security", "cloud-management"). */
	categories: string[]
	/** Maintenance contacts. */
	contacts: PubliccodeContactEntry[]
	/** Maintenance contractors. */
	contractors: PubliccodeContractorEntry[]
	/** Software dependencies (open, proprietary, hardware). */
	dependencies: PubliccodeDependencyEntry[]
	/** Preferred description (English if available, else first language). */
	description?: PubliccodeDescription
	/** All localized descriptions keyed by language code. */
	descriptions: Record<string, PubliccodeDescription>
	/** Development status (concept, development, beta, stable, obsolete). */
	developmentStatus?: string
	/** Supported input MIME types. */
	inputTypes: string[]
	/** URL of upstream software this is based on. */
	isBasedOn?: string
	/** Landing page URL. */
	landingUrl?: string
	/** SPDX license expression. */
	license?: string
	/** Whether the software supports localization. */
	localisationReady?: boolean
	/** Path or URL to logo image. */
	logo?: string
	/** Main copyright holder. */
	mainCopyrightOwner?: string
	/** Maintenance type (internal, community, contract, none). */
	maintenanceType?: string
	/** Path or URL to monochrome logo image. */
	monochromeLogo?: string
	/** Software name. */
	name?: string
	/** Supported output MIME types. */
	outputTypes: string[]
	/** Supported platforms (e.g. "web", "linux", "mac"). */
	platforms: string[]
	/** publiccode.yml schema version. */
	publiccodeYmlVersion?: string
	/** Release date (YYYY-MM-DD). */
	releaseDate?: string
	/** Repository owner name. */
	repoOwner?: string
	/** Roadmap URL. */
	roadmap?: string
	/** Software type (e.g. "standalone/web", "standalone/other"). */
	softwareType?: string
	/** Software version string. */
	softwareVersion?: string
	/** Repository URL. */
	url?: string
	/** Organizations using this software. */
	usedBy: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Coerce YAML values that may be parsed as non-strings back to strings. */
function toString(value: unknown): string | undefined {
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	if (value instanceof Date) return value.toISOString().slice(0, 10)
	return undefined
}

/** Check if a value is a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

/** Check if a value is a plain object (not null, not array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

/** Extract string array from a YAML value, filtering non-strings. */
function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
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
		...(isNonEmptyString(data.documentation) ? { documentation: data.documentation } : {}),
		features,
		...(isNonEmptyString(data.genericName) ? { genericName: data.genericName } : {}),
		...(isNonEmptyString(data.localisedName) ? { localisedName: data.localisedName as string } : {}),
		...(isNonEmptyString(data.longDescription)
			? { longDescription: (data.longDescription as string).trim() }
			: {}),
		...(isNonEmptyString(data.shortDescription)
			? { shortDescription: (data.shortDescription as string).trim() }
			: {}),
	}
}

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * Parse a publiccode.yml / publiccode.yaml file content.
 * @param content - Raw YAML file content.
 * @returns Parsed publiccode metadata, or `undefined` if the content is invalid.
 */
export function parsePubliccode(content: string): Publiccode | undefined {
	let data: unknown
	try {
		data = parseYaml(content)
	} catch {
		return undefined
	}

	if (!isPlainObject(data)) return undefined

	// Basic validation: must have at least a name or url
	if (!isNonEmptyString(data.name) && !isNonEmptyString(data.url)) return undefined

	// ─── Descriptions ──────────────────────────────────────────
	const descriptions: Record<string, PubliccodeDescription> = {}
	let description: PubliccodeDescription | undefined

	if (isPlainObject(data.description)) {
		const descObj = data.description as Record<string, unknown>
		for (const [lang, langData] of Object.entries(descObj)) {
			if (isPlainObject(langData)) {
				descriptions[lang] = parseDescription(langData)
			}
		}

		// Prefer English, fall back to first available language
		const preferredLang = 'en' in descriptions ? 'en' : Object.keys(descriptions)[0]
		if (preferredLang) {
			description = descriptions[preferredLang]
		}
	}

	// ─── Contacts ──────────────────────────────────────────────
	const contacts: PubliccodeContactEntry[] = []
	if (isPlainObject(data.maintenance)) {
		const maintenance = data.maintenance as Record<string, unknown>
		if (Array.isArray(maintenance.contacts)) {
			for (const contact of maintenance.contacts) {
				if (isPlainObject(contact) && isNonEmptyString(contact.name)) {
					const entry: PubliccodeContactEntry = { name: contact.name }
					if (isNonEmptyString(contact.email)) entry.email = contact.email
					if (isNonEmptyString(contact.phone)) entry.phone = contact.phone
					if (isNonEmptyString(contact.affiliation)) entry.affiliation = contact.affiliation
					contacts.push(entry)
				}
			}
		}
	}

	// ─── Contractors ───────────────────────────────────────────
	const contractors: PubliccodeContractorEntry[] = []
	if (isPlainObject(data.maintenance)) {
		const maintenance = data.maintenance as Record<string, unknown>
		if (Array.isArray(maintenance.contractors)) {
			for (const contractor of maintenance.contractors) {
				if (isPlainObject(contractor) && isNonEmptyString(contractor.name)) {
					const entry: PubliccodeContractorEntry = { name: contractor.name }
					const until = toString(contractor.until)
					if (until) entry.until = until
					if (isNonEmptyString(contractor.website)) entry.website = contractor.website
					contractors.push(entry)
				}
			}
		}
	}

	// ─── Dependencies ──────────────────────────────────────────
	const dependencies: PubliccodeDependencyEntry[] = []
	if (isPlainObject(data.dependsOn)) {
		const dependsOn = data.dependsOn as Record<string, unknown>
		for (const category of ['open', 'proprietary', 'hardware'] as const) {
			if (Array.isArray(dependsOn[category])) {
				for (const dep of dependsOn[category] as unknown[]) {
					if (isPlainObject(dep) && isNonEmptyString(dep.name)) {
						const entry: PubliccodeDependencyEntry = {
							category,
							name: dep.name,
						}

						const version = toString(dep.version)
						if (version) entry.version = version

						const versionMin = toString(dep.versionMin)
						if (versionMin) entry.versionMin = versionMin

						const versionMax = toString(dep.versionMax)
						if (versionMax) entry.versionMax = versionMax

						if (typeof dep.optional === 'boolean') entry.optional = dep.optional

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
		const loc = data.localisation as Record<string, unknown>
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
		const legal = data.legal as Record<string, unknown>
		if (isNonEmptyString(legal.license)) license = legal.license
		if (isNonEmptyString(legal.mainCopyrightOwner)) mainCopyrightOwner = legal.mainCopyrightOwner
		if (isNonEmptyString(legal.repoOwner)) repoOwner = legal.repoOwner
	}

	// ─── Assemble result ───────────────────────────────────────
	const version = toString(data.softwareVersion)
	const releaseDate = toString(data.releaseDate)

	return {
		...(isNonEmptyString(data.applicationSuite) ? { applicationSuite: data.applicationSuite } : {}),
		availableLanguages,
		categories: toStringArray(data.categories),
		contacts,
		contractors,
		dependencies,
		...(description ? { description } : {}),
		descriptions,
		...(isNonEmptyString(data.developmentStatus) ? { developmentStatus: data.developmentStatus } : {}),
		inputTypes: toStringArray(data.inputTypes),
		...(isNonEmptyString(data.isBasedOn) ? { isBasedOn: data.isBasedOn } : {}),
		...(isNonEmptyString(data.landingURL) ? { landingUrl: data.landingURL } : {}),
		...(license ? { license } : {}),
		...(localisationReady !== undefined ? { localisationReady } : {}),
		...(isNonEmptyString(data.logo) ? { logo: data.logo } : {}),
		...(mainCopyrightOwner ? { mainCopyrightOwner } : {}),
		...(isPlainObject(data.maintenance) && isNonEmptyString((data.maintenance as Record<string, unknown>).type)
			? { maintenanceType: (data.maintenance as Record<string, unknown>).type as string }
			: {}),
		...(isNonEmptyString(data.monochromeLogo) ? { monochromeLogo: data.monochromeLogo } : {}),
		...(isNonEmptyString(data.name) ? { name: data.name } : {}),
		outputTypes: toStringArray(data.outputTypes),
		platforms: toStringArray(data.platforms),
		...(isNonEmptyString(data.publiccodeYmlVersion)
			? { publiccodeYmlVersion: data.publiccodeYmlVersion }
			: toString(data.publiccodeYmlVersion)
				? { publiccodeYmlVersion: toString(data.publiccodeYmlVersion) }
				: {}),
		...(releaseDate ? { releaseDate } : {}),
		...(repoOwner ? { repoOwner } : {}),
		...(isNonEmptyString(data.roadmap) ? { roadmap: data.roadmap } : {}),
		...(isNonEmptyString(data.softwareType) ? { softwareType: data.softwareType } : {}),
		...(version ? { softwareVersion: version } : {}),
		...(isNonEmptyString(data.url) ? { url: data.url } : {}),
		usedBy: toStringArray(data.usedBy),
	}
}
