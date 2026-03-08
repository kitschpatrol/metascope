/**
 * Parser for codemeta.json files.
 *
 * Reads a codemeta.json file (v1, v2, or v3) and normalizes it into a
 * consistent shape with predictable types. No enrichment, no JSON-LD
 * expansion — just an honest representation of what's in the file.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type CodeMetaPersonOrOrg = {
	affiliation?: string
	email?: string
	familyName?: string
	givenName?: string
	id?: string
	name?: string
	type?: 'Organization' | 'Person'
	url?: string
}

export type CodeMetaDependency = {
	identifier?: string
	name?: string
	runtimePlatform?: string
	version?: string
}

export type CodeMetaJsonData = {
	applicationCategory?: string
	applicationSubCategory?: string
	author?: CodeMetaPersonOrOrg[]
	buildInstructions?: string
	codeRepository?: string
	continuousIntegration?: string
	contributor?: CodeMetaPersonOrOrg[]
	copyrightHolder?: CodeMetaPersonOrOrg[]
	copyrightYear?: number
	dateCreated?: string
	dateModified?: string
	datePublished?: string
	description?: string
	developmentStatus?: string
	downloadUrl?: string
	funder?: CodeMetaPersonOrOrg[]
	funding?: string
	identifier?: string
	installUrl?: string
	isAccessibleForFree?: boolean
	issueTracker?: string
	keywords?: string[]
	license?: string | string[]
	maintainer?: CodeMetaPersonOrOrg[]
	name?: string
	operatingSystem?: string[]
	programmingLanguage?: string[]
	readme?: string
	relatedLink?: string | string[]
	releaseNotes?: string
	runtimePlatform?: string[]
	softwareHelp?: string
	softwareRequirements?: CodeMetaDependency[]
	softwareSuggestions?: CodeMetaDependency[]
	softwareVersion?: string
	url?: string
	version?: string
}

// ─── V1 property name mapping ────────────────────────────────────────

/** Map v1 property names to their v2/v3 equivalents. */
const v1PropertyMap: Record<string, string> = {
	// v1 used "agents" for people
	agents: 'author',
	// v1 used "contIntegration"
	contIntegration: 'continuousIntegration',
	// v1 used "depends"
	depends: 'softwareRequirements',
	// v1 used "suggests"
	suggests: 'softwareSuggestions',
	// v1 used "title"
	title: 'name',
}

// ─── Fields that should always be arrays ─────────────────────────────

const personFields = new Set([
	'author',
	'contributor',
	'copyrightHolder',
	'editor',
	'funder',
	'maintainer',
	'producer',
	'publisher',
	'sponsor',
])

// ─── Parser ──────────────────────────────────────────────────────────

export function parseCodemetaJson(content: string): CodeMetaJsonData | undefined {
	let raw: Record<string, unknown>
	try {
		raw = JSON.parse(content) as Record<string, unknown>
	} catch {
		return undefined
	}

	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return undefined
	}

	// Migrate v1 property names
	const migrated = migrateV1Properties(raw)

	const result: CodeMetaJsonData = {}

	// Extract simple string fields
	assignString(result, migrated, 'applicationCategory')
	assignString(result, migrated, 'applicationSubCategory')
	assignString(result, migrated, 'buildInstructions')
	assignString(result, migrated, 'codeRepository')
	assignString(result, migrated, 'continuousIntegration')
	assignString(result, migrated, 'dateCreated')
	assignString(result, migrated, 'dateModified')
	assignString(result, migrated, 'datePublished')
	assignString(result, migrated, 'description')
	assignString(result, migrated, 'developmentStatus')
	assignString(result, migrated, 'downloadUrl')
	assignString(result, migrated, 'funding')
	assignString(result, migrated, 'identifier')
	assignString(result, migrated, 'installUrl')
	assignString(result, migrated, 'issueTracker')
	assignString(result, migrated, 'name')
	assignString(result, migrated, 'readme')
	assignString(result, migrated, 'releaseNotes')
	assignString(result, migrated, 'softwareHelp')
	assignString(result, migrated, 'softwareVersion')
	assignString(result, migrated, 'url')
	assignString(result, migrated, 'version')

	// Also check dateReleased → datePublished (common alternative)
	if (!result.datePublished && typeof migrated.dateReleased === 'string') {
		result.datePublished = migrated.dateReleased
	}

	// Boolean fields
	if (typeof migrated.isAccessibleForFree === 'boolean') {
		result.isAccessibleForFree = migrated.isAccessibleForFree
	}

	// Number fields
	if (typeof migrated.copyrightYear === 'number') {
		result.copyrightYear = migrated.copyrightYear
	}

	// License — preserve as string or string[]
	const license = migrated.license
	if (typeof license === 'string') {
		result.license = license
	} else if (Array.isArray(license)) {
		const licenses = license.filter((l): l is string => typeof l === 'string')
		if (licenses.length > 0) result.license = licenses
	}

	// relatedLink — preserve as string or string[]
	const relatedLink = migrated.relatedLink
	if (typeof relatedLink === 'string') {
		result.relatedLink = relatedLink
	} else if (Array.isArray(relatedLink)) {
		const links = relatedLink.filter((l): l is string => typeof l === 'string')
		if (links.length > 0) result.relatedLink = links
	}

	// String array fields
	assignStringArray(result, migrated, 'keywords')
	assignStringArray(result, migrated, 'operatingSystem')
	assignStringArray(result, migrated, 'programmingLanguage')
	assignStringArray(result, migrated, 'runtimePlatform')

	// Person/Org array fields
	for (const field of personFields) {
		const value = migrated[field]
		if (value === undefined || value === null) continue
		const people = normalizePersonArray(value)
		if (people.length > 0) {
			// eslint-disable-next-line ts/no-unsafe-member-access, ts/no-explicit-any
			;(result as any)[field] = people
		}
	}

	// Dependency fields
	assignDependencyArray(result, migrated, 'softwareRequirements')
	assignDependencyArray(result, migrated, 'softwareSuggestions')

	return result
}

// ─── Helpers ─────────────────────────────────────────────────────────

function migrateV1Properties(raw: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(raw)) {
		// Skip JSON-LD boilerplate
		if (key.startsWith('@')) continue
		const mappedKey = v1PropertyMap[key] ?? key
		// Don't overwrite if already set (prefer v2/v3 names)
		if (!(mappedKey in result)) {
			result[mappedKey] = value
		}
	}
	return result
}

function assignString(
	result: Record<string, unknown>,
	source: Record<string, unknown>,
	key: string,
): void {
	const value = source[key]
	if (typeof value === 'string' && value.length > 0) {
		result[key] = value
	} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		// Handle {"@type": "xsd:anyURI", "@value": "..."} pattern from v3
		const objValue = value as Record<string, unknown>
		if (typeof objValue['@value'] === 'string') {
			result[key] = objValue['@value']
		}
	}
}

function assignStringArray(
	result: Record<string, unknown>,
	source: Record<string, unknown>,
	key: string,
): void {
	const value = source[key]
	if (value === undefined || value === null) return

	if (typeof value === 'string') {
		// Could be comma-separated (common in v1)
		result[key] = value.includes(',')
			? value.split(',').map((s) => s.trim()).filter(Boolean)
			: [value]
	} else if (Array.isArray(value)) {
		const strings = value
			.map((item) => {
				if (typeof item === 'string') return item
				// Handle {"name": "Python"} objects in programmingLanguage
				if (typeof item === 'object' && item !== null) {
					const obj = item as Record<string, unknown>
					return (typeof obj.name === 'string' ? obj.name : undefined)
				}
				return undefined
			})
			.filter((s): s is string => typeof s === 'string' && s.length > 0)
		if (strings.length > 0) result[key] = strings
	}
}

function normalizePersonOrOrg(value: unknown): CodeMetaPersonOrOrg | undefined {
	if (typeof value === 'string') {
		return { name: value }
	}

	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return undefined
	}

	const obj = value as Record<string, unknown>
	const person: CodeMetaPersonOrOrg = {}

	if (typeof obj['@type'] === 'string') {
		const rawType = obj['@type'].toLowerCase()
		if (rawType === 'person') person.type = 'Person'
		else if (rawType === 'organization') person.type = 'Organization'
	}

	if (typeof obj['@id'] === 'string') person.id = obj['@id']
	if (typeof obj.name === 'string') person.name = obj.name
	if (typeof obj.givenName === 'string') person.givenName = obj.givenName
	if (typeof obj.familyName === 'string') person.familyName = obj.familyName
	if (typeof obj.email === 'string') person.email = obj.email
	if (typeof obj.url === 'string') person.url = obj.url

	// Affiliation can be a string or an object with a name
	if (typeof obj.affiliation === 'string') {
		person.affiliation = obj.affiliation
	} else if (typeof obj.affiliation === 'object' && obj.affiliation !== null) {
		const aff = obj.affiliation as Record<string, unknown>
		if (typeof aff.name === 'string') person.affiliation = aff.name
	}

	// Only return if we got at least some identifying info
	if (person.name || person.givenName || person.familyName || person.email) {
		return person
	}

	return undefined
}

function normalizePersonArray(value: unknown): CodeMetaPersonOrOrg[] {
	if (Array.isArray(value)) {
		return value
			.map((item) => normalizePersonOrOrg(item))
			.filter((p): p is CodeMetaPersonOrOrg => p !== undefined)
	}

	const single = normalizePersonOrOrg(value)
	return single ? [single] : []
}

function normalizeDependency(value: unknown): CodeMetaDependency | undefined {
	if (typeof value === 'string') {
		return { name: value }
	}

	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return undefined
	}

	const obj = value as Record<string, unknown>
	const dep: CodeMetaDependency = {}

	if (typeof obj.name === 'string') dep.name = obj.name
	if (typeof obj.identifier === 'string') dep.identifier = obj.identifier
	if (typeof obj.version === 'string') dep.version = obj.version
	if (typeof obj.runtimePlatform === 'string') dep.runtimePlatform = obj.runtimePlatform

	if (dep.name || dep.identifier) {
		return dep
	}

	return undefined
}

function assignDependencyArray(
	result: Record<string, unknown>,
	source: Record<string, unknown>,
	key: string,
): void {
	const value = source[key]
	if (value === undefined || value === null) return

	if (Array.isArray(value)) {
		const deps = value
			.map((item) => normalizeDependency(item))
			.filter((d): d is CodeMetaDependency => d !== undefined)
		if (deps.length > 0) {
			result[key] = deps
		}
	} else {
		const dep = normalizeDependency(value)
		if (dep) {
			result[key] = [dep]
		}
	}
}
