/**
 * Parser for Maven `pom.xml` files.
 *
 * Extracts project metadata from Maven POM (Project Object Model) files,
 * including coordinates (groupId/artifactId), developers, contributors,
 * licenses, dependencies (with test scope separation), SCM info, CI/issue
 * management URLs, and organization details.
 *
 * Uses `fast-xml-parser` with namespace prefix removal and attribute ignoring.
 */

import { XMLParser } from 'fast-xml-parser'

// ─── Types ──────────────────────────────────────────────────────────

/** A developer or contributor entry from a POM file. */
export type PomXmlPersonEntry = {
	/** Email address. */
	email?: string
	/** Person display name. */
	name: string
	/** Organization affiliation. */
	organization?: string
	/** Personal URL. */
	url?: string
}

/** A license entry from a POM file. */
export type PomXmlLicenseEntry = {
	/** License name (e.g. "The Apache License, Version 2.0"). */
	name?: string
	/** URL to the license text. */
	url?: string
}

/** A dependency entry from a POM file. */
export type PomXmlDependencyEntry = {
	/** Maven artifactId. */
	artifactId: string
	/** Maven groupId. */
	groupId: string
	/** Version string (excluded if it references a Maven variable). */
	version?: string
}

/** An organization entry from a POM file. */
export type PomXmlOrganization = {
	/** Organization name. */
	name: string
	/** Organization URL. */
	url?: string
}

/** Parsed result from a Maven `pom.xml` file. */
export type PomXml = {
	/** Maven artifactId. */
	artifactId?: string
	/** CI management URL. */
	ciManagementUrl?: string
	/** Project contributors. */
	contributors: PomXmlPersonEntry[]
	/** Runtime dependencies (non-test scope). */
	dependencies: PomXmlDependencyEntry[]
	/** Project description. */
	description?: string
	/** Test-scope dependencies. */
	devDependencies: PomXmlDependencyEntry[]
	/** Project developers / authors. */
	developers: PomXmlPersonEntry[]
	/** Maven groupId. */
	groupId?: string
	/** Combined identifier (groupId.artifactId). */
	identifier?: string
	/** Year of project inception. */
	inceptionYear?: string
	/** Issue tracker URL. */
	issueManagementUrl?: string
	/** Java version from properties. */
	javaVersion?: string
	/** Project licenses. */
	licenses: PomXmlLicenseEntry[]
	/** Project name (with Maven variables resolved). */
	name?: string
	/** Producer organization. */
	organization?: PomXmlOrganization
	/** SCM (source code management) URL. */
	scmUrl?: string
	/** Project URL / homepage. */
	url?: string
	/** Project version. */
	version?: string
}

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a Maven `pom.xml` content string into a structured object.
 * Returns undefined if the XML is malformed or missing the `<project>` root element.
 */
export function parsePomXml(content: string): PomXml | undefined {
	const parser = new XMLParser({
		ignoreAttributes: true,
		parseTagValue: false,
		removeNSPrefix: true,
	})

	let data: Record<string, unknown>
	try {
		data = parser.parse(content) as Record<string, unknown>
	} catch {
		return undefined
	}

	const project = data.project as Record<string, unknown> | undefined
	if (!project) return undefined

	const groupId = getString(project.groupId)
	const artifactId = getString(project.artifactId)

	const { dependencies, devDependencies } = parseDependencies(project)

	return {
		artifactId,
		ciManagementUrl: getNestedUrl(project.ciManagement),
		contributors: parsePersonEntries(project.contributors, 'contributor'),
		dependencies,
		description: getString(project.description),
		devDependencies,
		developers: parsePersonEntries(project.developers, 'developer'),
		groupId,
		identifier: groupId && artifactId ? `${groupId}.${artifactId}` : undefined,
		inceptionYear: getString(project.inceptionYear),
		issueManagementUrl: getNestedUrl(project.issueManagement),
		javaVersion: parseJavaVersion(project),
		licenses: parseLicenses(project),
		name: resolveName(project, groupId, artifactId),
		organization: parseOrganization(project),
		scmUrl: parseScmUrl(project),
		url: getString(project.url),
		version: getString(project.version),
	}
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Ensure a value is an array (XML parser may return single objects or arrays).
 */
function ensureArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) return []
	return Array.isArray(value) ? value : [value]
}

/**
 * Get a trimmed non-empty string from a parsed XML value.
 * Returns undefined for empty strings, non-strings, whitespace-only, or Maven variable references.
 */
function getString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (trimmed.length === 0) return undefined
	return trimmed
}

/**
 * Get a string, additionally filtering out Maven variable references ($).
 */
function getCleanString(value: unknown): string | undefined {
	const s = getString(value)
	if (s?.includes('$')) return undefined
	return s
}

/**
 * Resolve Maven variable references in a project name.
 */
function resolveName(
	project: Record<string, unknown>,
	groupId: string | undefined,
	artifactId: string | undefined,
): string | undefined {
	const name = getString(project.name)
	if (!name) return undefined

	let resolved = name
	if (groupId) {
		resolved = resolved.replaceAll('${project.groupId}', groupId)
	}

	if (artifactId) {
		resolved = resolved.replaceAll('${project.artifactId}', artifactId)
	}

	return resolved
}

/**
 * Extract a URL from a nested object (e.g. `<ciManagement><url>...</url></ciManagement>`).
 * Filters out Maven variable references.
 */
function getNestedUrl(container: unknown): string | undefined {
	if (typeof container !== 'object' || container === null) return undefined
	return getCleanString((container as Record<string, unknown>).url)
}

/**
 * Parse person entries (developers or contributors) from POM XML.
 */
function parsePersonEntries(container: unknown, childKey: string): PomXmlPersonEntry[] {
	if (typeof container !== 'object' || container === null) return []

	const results: PomXmlPersonEntry[] = []
	for (const entry of ensureArray(
		(container as Record<string, unknown>)[childKey] as
			| Array<Record<string, unknown>>
			| Record<string, unknown>
			| undefined,
	)) {
		if (typeof entry !== 'object' || entry === null) continue
		const record = entry
		const name = getString(record.name)
		if (!name) continue

		results.push({
			email: getString(record.email),
			name,
			organization: getString(record.organization),
			url: getString(record.url),
		})
	}

	return results
}

/**
 * Parse license entries from `<licenses><license>...</license></licenses>`.
 */
function parseLicenses(project: Record<string, unknown>): PomXmlLicenseEntry[] {
	const container = project.licenses
	if (typeof container !== 'object' || container === null) return []

	const results: PomXmlLicenseEntry[] = []
	for (const entry of ensureArray(
		(container as Record<string, unknown>).license as
			| Array<Record<string, unknown>>
			| Record<string, unknown>
			| undefined,
	)) {
		if (typeof entry !== 'object' || entry === null) continue
		const record = entry
		const name = getString(record.name)
		const url = getString(record.url)
		if (name || url) {
			results.push({ name, url })
		}
	}

	return results
}

/**
 * Parse dependencies, separating test-scope into devDependencies.
 */
function parseDependencies(project: Record<string, unknown>): {
	dependencies: PomXmlDependencyEntry[]
	devDependencies: PomXmlDependencyEntry[]
} {
	const dependencies: PomXmlDependencyEntry[] = []
	const devDependencies: PomXmlDependencyEntry[] = []

	const container = project.dependencies
	if (typeof container !== 'object' || container === null) {
		return { dependencies, devDependencies }
	}

	for (const entry of ensureArray(
		(container as Record<string, unknown>).dependency as
			| Array<Record<string, unknown>>
			| Record<string, unknown>
			| undefined,
	)) {
		if (typeof entry !== 'object' || entry === null) continue
		const record = entry
		const groupId = getString(record.groupId)
		const artifactId = getString(record.artifactId)
		if (!groupId || !artifactId) continue

		const dep: PomXmlDependencyEntry = {
			artifactId,
			groupId,
			version: getCleanString(record.version),
		}

		if (getString(record.scope) === 'test') {
			devDependencies.push(dep)
		} else {
			dependencies.push(dep)
		}
	}

	return { dependencies, devDependencies }
}

/**
 * Parse SCM URL, filtering out Maven variable references.
 */
function parseScmUrl(project: Record<string, unknown>): string | undefined {
	const { scm } = project
	if (typeof scm !== 'object' || scm === null) return undefined
	return getCleanString((scm as Record<string, unknown>).url)
}

/**
 * Parse organization from `<organization>` element.
 */
function parseOrganization(project: Record<string, unknown>): PomXmlOrganization | undefined {
	const org = project.organization
	if (typeof org !== 'object' || org === null) return undefined
	const record = org as Record<string, unknown>
	const name = getString(record.name)
	if (!name) return undefined

	return {
		name,
		url: getString(record.url),
	}
}

/**
 * Extract Java version from project properties.
 * Checks `java.version`, `maven.compiler.source`, and `java.compiler.source`.
 */
function parseJavaVersion(project: Record<string, unknown>): string | undefined {
	const props = project.properties
	if (typeof props !== 'object' || props === null) return undefined
	const record = props as Record<string, unknown>

	return (
		getCleanString(record['java.version']) ??
		getCleanString(record['maven.compiler.source']) ??
		getCleanString(record['java.compiler.source'])
	)
}
