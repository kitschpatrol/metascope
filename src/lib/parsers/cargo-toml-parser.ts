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

// ─── Types ──────────────────────────────────────────────────────────

/** Parsed author entry from the `authors` field. */
export type CargoTomlAuthorEntry = {
	email: string | undefined
	name: string
}

/** Parsed dependency with version info. */
export type CargoTomlDependencyEntry = {
	name: string
	version: string | undefined
}

/** Parsed result from a `Cargo.toml` file. */
export type CargoToml = {
	/** Parsed author entries from `package.authors`. */
	authors: CargoTomlAuthorEntry[]
	/** Build dependency names and versions from `[build-dependencies]`. */
	buildDependencies: CargoTomlDependencyEntry[]
	/** Category strings from `package.categories`. */
	categories: string[]
	/** Dependencies from `[dependencies]`. */
	dependencies: CargoTomlDependencyEntry[]
	/** Description from `package.description`. */
	description: string | undefined
	/** Dev dependency names and versions from `[dev-dependencies]`. */
	devDependencies: CargoTomlDependencyEntry[]
	/** Documentation URL from `package.documentation`. */
	documentation: string | undefined
	/** Rust edition from `package.edition`. */
	edition: string | undefined
	/** Homepage URL from `package.homepage`. */
	homepage: string | undefined
	/** Keywords from `package.keywords`. */
	keywords: string[]
	/** License identifier from `package.license`. */
	license: string | undefined
	/** License file path from `package.license-file`. */
	licenseFile: string | undefined
	/** Package name from `package.name`. */
	name: string | undefined
	/** Readme file path from `package.readme`. */
	readme: string | undefined
	/** Repository URL from `package.repository`. */
	repository: string | undefined
	/** Minimum Rust version from `package.rust-version`. */
	rustVersion: string | undefined
	/** Version string from `package.version`. */
	version: string | undefined
	/** Workspace members from `[workspace]`. */
	workspaceMembers: string[]
}

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

	return {
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
	}
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
