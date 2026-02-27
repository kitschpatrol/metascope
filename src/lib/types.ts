export type { CodeMetaData } from './sources/codemeta'
export type { GitConfig, GitData } from './sources/git'
export type { GitHubData } from './sources/github'
export type { LocData, LocLanguageEntry, LocLanguageStats } from './sources/loc'
export type { MetascopeData } from './sources/metascope'
export type { NpmData } from './sources/npm'
export type { ObsidianData } from './sources/obsidian'
export type { PackageData } from './sources/package'
export type { PypiData } from './sources/pypi'
export type { PyprojectData } from './sources/pyproject'
export type { UpdatesData, UpdatesPackage } from './sources/updates'

import type { CodeMetaData } from './sources/codemeta'
import type { GitData } from './sources/git'
import type { GitHubData } from './sources/github'
import type { LocData } from './sources/loc'
import type { MetascopeData } from './sources/metascope'
import type { NpmData } from './sources/npm'
import type { ObsidianData } from './sources/obsidian'
import type { PackageData } from './sources/package'
import type { PypiData } from './sources/pypi'
import type { PyprojectData } from './sources/pyproject'
import type { UpdatesData } from './sources/updates'

// ── Aggregate Context ──────────────────────────────────

/**
 * The complete metadata context assembled from all sources.
 * Each key corresponds to a metadata source.
 */
export type MetadataContext = {
	codemeta: CodeMetaData
	git: GitData
	github: GitHubData
	loc: LocData
	metascope: MetascopeData
	npm: NpmData
	obsidian: ObsidianData
	package: PackageData
	pypi: PypiData
	pyproject: PyprojectData
	updates: UpdatesData
}

/**
 * The name of a metadata source.
 */
export type SourceName = keyof MetadataContext

// ── Template ───────────────────────────────────────────

/**
 * A template function that transforms MetadataContext into a custom shape.
 */
export type Template<T> = (context: MetadataContext) => T

/**
 * Identity wrapper for type inference in config files.
 * Use this in `metascope.config.ts` to get autocomplete on available fields.
 * @example
 * ```typescript
 * import { defineTemplate } from 'metascope'
 *
 * export default defineTemplate(({ codemeta, github }) => ({
 *   name: codemeta.name,
 *   stars: github.stargazerCount,
 * }))
 * ```
 */
export function defineTemplate<T>(fn: Template<T>): Template<T> {
	return fn
}

// ── Credentials ────────────────────────────────────────

/**
 * API credentials for remote metadata sources.
 */
export type Credentials = {
	githubToken?: string
}

// ── Options ────────────────────────────────────────────

/**
 * Options for `getMetadata` without a template (returns full `MetadataContext`).
 */
export type GetMetadataOptions = {
	/** API credentials for remote sources. */
	credentials?: Credentials
	/** Project directory path. */
	path: string
	/** Built-in template name (e.g., "summary") or omit for full output. */
	template?: string
}

/**
 * Options for `getMetadata` with a template function (returns the template's return type).
 */
export type GetMetadataTemplateOptions<T> = {
	/** API credentials for remote sources. */
	credentials?: Credentials
	/** Project directory path. */
	path: string
	/** Template function that transforms MetadataContext into a custom shape. */
	template: Template<T>
}
