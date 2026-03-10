/**
 * Source and parser for Maven `pom.xml` files.
 *
 * Extracts project metadata from Maven POM (Project Object Model) files,
 * including coordinates (groupId/artifactId), developers, contributors,
 * licenses, dependencies (with test scope separation), SCM info, CI/issue
 * management URLs, and organization details.
 *
 * Uses `fast-xml-parser` with namespace prefix removal and attribute ignoring.
 */

import is from '@sindresorhus/is'
import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { ensureArray } from '../utilities/formatting'
import { nonEmptyString, optionalUrl } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const pomXmlPersonEntrySchema = z.object({
	email: z.string().optional(),
	name: z.string(),
	organization: z.string().optional(),
	url: z.string().optional(),
})

const pomXmlLicenseEntrySchema = z.object({
	name: z.string().optional(),
	url: z.string().optional(),
})

const pomXmlDependencyEntrySchema = z.object({
	artifactId: z.string(),
	groupId: z.string(),
	version: z.string().optional(),
})

const pomXmlOrganizationSchema = z.object({
	name: z.string(),
	url: z.string().optional(),
})

const pomXmlSchema = z.object({
	/** Maven artifactId. */
	artifactId: nonEmptyString,
	/** CI management URL. */
	ciManagementUrl: optionalUrl,
	/** Project contributors. */
	contributors: z.array(pomXmlPersonEntrySchema),
	/** Runtime dependencies (non-test scope). */
	dependencies: z.array(pomXmlDependencyEntrySchema),
	/** Project description. */
	description: nonEmptyString,
	/** Test-scope dependencies. */
	devDependencies: z.array(pomXmlDependencyEntrySchema),
	/** Project developers / authors. */
	developers: z.array(pomXmlPersonEntrySchema),
	/** Maven groupId. */
	groupId: nonEmptyString,
	/** Combined identifier (groupId.artifactId). */
	identifier: nonEmptyString,
	/** Year of project inception. */
	inceptionYear: nonEmptyString,
	/** Issue tracker URL. */
	issueManagementUrl: optionalUrl,
	/** Java version from properties. */
	javaVersion: nonEmptyString,
	/** Project licenses. */
	licenses: z.array(pomXmlLicenseEntrySchema),
	/** Project name (with Maven variables resolved). */
	name: nonEmptyString,
	/** Producer organization. */
	organization: pomXmlOrganizationSchema.optional(),
	/** SCM (source code management) URL. */
	scmUrl: optionalUrl,
	/** Project URL / homepage. */
	url: optionalUrl,
	/** Project version. */
	version: nonEmptyString,
})

export type PomXml = z.infer<typeof pomXmlSchema>

type PomXmlPersonEntry = PomXml['developers'][number]
type PomXmlLicenseEntry = PomXml['licenses'][number]
type PomXmlDependencyEntry = PomXml['dependencies'][number]
type PomXmlOrganization = NonNullable<PomXml['organization']>

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a Maven `pom.xml` content string into a structured object.
 * Returns undefined if the XML is malformed or missing the `<project>` root element.
 */
export function parse(content: string): PomXml | undefined {
	const parser = new XMLParser({
		ignoreAttributes: true,
		parseTagValue: false,
		removeNSPrefix: true,
	})

	let data: Record<string, unknown>
	try {
		const parsed: unknown = parser.parse(content)
		if (!is.plainObject(parsed)) return undefined
		data = parsed
	} catch {
		return undefined
	}

	if (!is.plainObject(data.project)) return undefined
	const { project } = data

	const groupId = getString(project.groupId)
	const artifactId = getString(project.artifactId)

	const { dependencies, devDependencies } = parseDependencies(project)

	return pomXmlSchema.parse({
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
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

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
		// This matches an actual Maven string literal...
		// eslint-disable-next-line no-template-curly-in-string
		resolved = resolved.replaceAll('${project.groupId}', groupId)
	}

	if (artifactId) {
		// This matches an actual Maven string literal...
		// eslint-disable-next-line no-template-curly-in-string
		resolved = resolved.replaceAll('${project.artifactId}', artifactId)
	}

	return resolved
}

/**
 * Extract a URL from a nested object (e.g. `<ciManagement><url>...</url></ciManagement>`).
 * Filters out Maven variable references.
 */
function getNestedUrl(container: unknown): string | undefined {
	if (!is.plainObject(container)) return undefined
	return getCleanString(container.url)
}

/**
 * Parse person entries (developers or contributors) from POM XML.
 */
function parsePersonEntries(container: unknown, childKey: string): PomXmlPersonEntry[] {
	if (!is.plainObject(container)) return []
	const children = container[childKey]
	const results: PomXmlPersonEntry[] = []
	for (const entry of ensureArray(children)) {
		if (!is.plainObject(entry)) continue
		const name = getString(entry.name)
		if (!name) continue
		results.push({
			email: getString(entry.email),
			name,
			organization: getString(entry.organization),
			url: getString(entry.url),
		})
	}
	return results
}

/**
 * Parse license entries from `<licenses><license>...</license></licenses>`.
 */
function parseLicenses(project: Record<string, unknown>): PomXmlLicenseEntry[] {
	if (!is.plainObject(project.licenses)) return []
	const results: PomXmlLicenseEntry[] = []
	for (const entry of ensureArray(project.licenses.license)) {
		if (!is.plainObject(entry)) continue
		const name = getString(entry.name)
		const url = getString(entry.url)
		if (name ?? url) {
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

	if (!is.plainObject(project.dependencies)) {
		return { dependencies, devDependencies }
	}
	for (const entry of ensureArray(project.dependencies.dependency)) {
		if (!is.plainObject(entry)) continue
		const groupId = getString(entry.groupId)
		const artifactId = getString(entry.artifactId)
		if (!groupId || !artifactId) continue
		const dep: PomXmlDependencyEntry = {
			artifactId,
			groupId,
			version: getCleanString(entry.version),
		}
		if (getString(entry.scope) === 'test') {
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
	if (!is.plainObject(project.scm)) return undefined
	return getCleanString(project.scm.url)
}

/**
 * Parse organization from `<organization>` element.
 */
function parseOrganization(project: Record<string, unknown>): PomXmlOrganization | undefined {
	if (!is.plainObject(project.organization)) return undefined
	const name = getString(project.organization.name)
	if (!name) return undefined
	return {
		name,
		url: getString(project.organization.url),
	}
}

/**
 * Extract Java version from project properties.
 * Checks `java.version`, `maven.compiler.source`, and `java.compiler.source`.
 */
function parseJavaVersion(project: Record<string, unknown>): string | undefined {
	if (!is.plainObject(project.properties)) return undefined
	return (
		getCleanString(project.properties['java.version']) ??
		getCleanString(project.properties['maven.compiler.source']) ??
		getCleanString(project.properties['java.compiler.source'])
	)
}

// ─── Source ─────────────────────────────────────────────────────────

export type JavaPomXmlData = OneOrMany<SourceRecord<PomXml>> | undefined

export const javaPomXmlSource = defineSource<'javaPomXml'>({
	async getInputs(context) {
		return getMatches(context.options, ['pom.xml'])
	},
	key: 'javaPomXml',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const data = parse(content)
		if (data !== undefined) {
			return { data, source: input }
		}
	},
	phase: 1,
})
