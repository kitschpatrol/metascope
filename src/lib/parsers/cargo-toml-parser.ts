/**
 * Parser for Rust `Cargo.toml` manifest files.
 * These are TOML files used by the Cargo package manager. Metadata lives
 * primarily in the `[package]` table, with dependencies in `[dependencies]`,
 * `[dev-dependencies]`, and `[build-dependencies]`.
 *
 * Uses `smol-toml` for TOML parsing.
 * @see https://doc.rust-lang.org/cargo/reference/manifest.html
 */

import { parse as parseToml } from 'smol-toml'
import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const cargoTomlAuthorEntrySchema = z.object({
	email: z.string().optional(),
	name: z.string(),
})

const cargoTomlDependencyEntrySchema = z.object({
	name: z.string(),
	version: z.string().optional(),
})

const cargoTomlSchema = z.object({
	/** Parsed author entries from `package.authors`. */
	authors: z.array(cargoTomlAuthorEntrySchema),
	/** Build dependency names and versions from `[build-dependencies]`. */
	buildDependencies: z.array(cargoTomlDependencyEntrySchema),
	/** Category strings from `package.categories`. */
	categories: stringArray,
	/** Dependencies from `[dependencies]`. */
	dependencies: z.array(cargoTomlDependencyEntrySchema),
	/** Description from `package.description`. */
	description: nonEmptyString,
	/** Dev dependency names and versions from `[dev-dependencies]`. */
	devDependencies: z.array(cargoTomlDependencyEntrySchema),
	/** Documentation URL from `package.documentation`. */
	documentation: optionalUrl,
	/** Rust edition from `package.edition`. */
	edition: nonEmptyString,
	/** Homepage URL from `package.homepage`. */
	homepage: optionalUrl,
	/** Keywords from `package.keywords`. */
	keywords: stringArray,
	/** License identifier from `package.license`. */
	license: nonEmptyString,
	/** License file path from `package.license-file`. */
	licenseFile: nonEmptyString,
	/** Package name from `package.name`. */
	name: nonEmptyString,
	/** Readme file path from `package.readme`. */
	readme: nonEmptyString,
	/** Repository URL from `package.repository`. */
	repository: optionalUrl,
	/** Minimum Rust version from `package.rust-version`. */
	rustVersion: nonEmptyString,
	/** Version string from `package.version`. */
	version: nonEmptyString,
	/** Workspace members from `[workspace]`. */
	workspaceMembers: stringArray,
})

export type CargoToml = z.infer<typeof cargoTomlSchema>

type CargoTomlAuthorEntry = CargoToml['authors'][number]
type CargoTomlDependencyEntry = CargoToml['dependencies'][number]

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a `Cargo.toml` content string into a structured object.
 * Returns undefined if the TOML is malformed.
 */
export function parseCargoToml(content: string): CargoToml | undefined {
	let data: Record<string, unknown>
	try {
		data = parseToml(content) as Record<string, unknown>
	} catch {
		return undefined
	}

	const pkg = (data.package ?? {}) as Record<string, unknown>
	const workspace = data.workspace as Record<string, unknown> | undefined

	return cargoTomlSchema.parse({
		authors: parseAuthors(pkg.authors),
		buildDependencies: parseDependencies(
			(data['build-dependencies'] ?? {}) as Record<string, unknown>,
		),
		categories: toStringArray(pkg.categories),
		dependencies: parseDependencies((data.dependencies ?? {}) as Record<string, unknown>),
		description: nonEmpty(pkg.description),
		devDependencies: parseDependencies((data['dev-dependencies'] ?? {}) as Record<string, unknown>),
		documentation: nonEmpty(pkg.documentation),
		edition: nonEmpty(pkg.edition),
		homepage: nonEmpty(pkg.homepage),
		keywords: toStringArray(pkg.keywords),
		license: nonEmpty(pkg.license),
		licenseFile: nonEmpty(pkg['license-file']),
		name: nonEmpty(pkg.name),
		readme: nonEmpty(pkg.readme),
		repository: nonEmpty(pkg.repository),
		rustVersion: nonEmpty(pkg['rust-version']),
		version: nonEmpty(pkg.version),
		workspaceMembers: toStringArray(workspace?.members),
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Return a trimmed string, or undefined if not a non-empty string. */
function nonEmpty(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

/** Convert an unknown value to a string array, filtering non-strings. */
function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Parse `authors` field entries. Each entry is `"Name <email>"` or `"Name"`.
 */
function parseAuthors(value: unknown): CargoTomlAuthorEntry[] {
	if (!Array.isArray(value)) return []

	const results: CargoTomlAuthorEntry[] = []
	for (const entry of value) {
		if (typeof entry !== 'string') continue
		const trimmed = entry.trim()
		if (trimmed.length === 0) continue

		const bracketIndex = trimmed.indexOf('<')
		if (bracketIndex !== -1) {
			const closeBracket = trimmed.indexOf('>', bracketIndex)
			if (closeBracket !== -1) {
				const name = trimmed.slice(0, bracketIndex).trim()
				const email = trimmed.slice(bracketIndex + 1, closeBracket).trim()
				results.push({
					email: email.length > 0 ? email : undefined,
					name,
				})
				continue
			}
		}

		results.push({ email: undefined, name: trimmed })
	}

	return results
}

/**
 * Parse a dependencies table into name/version entries.
 * Handles both `dep = "version"` and `dep = { version = "..." }` forms.
 */
function parseDependencies(table: Record<string, unknown>): CargoTomlDependencyEntry[] {
	const results: CargoTomlDependencyEntry[] = []

	for (const [name, value] of Object.entries(table)) {
		if (typeof value === 'string') {
			results.push({ name, version: value })
		} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			const object = value as Record<string, unknown>
			results.push({ name, version: nonEmpty(object.version) })
		} else {
			results.push({ name, version: undefined })
		}
	}

	return results
}
