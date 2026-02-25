export type { CodemetaData } from './sources/codemeta'
export type { GitData } from './sources/git'
export type { GitHubData } from './sources/github'
export type { LocData, LocLanguageEntry, LocLanguageStats } from './sources/loc'
export type { MetascopeData } from './sources/metascope'
export type { NpmData } from './sources/npm'
export type { ObsidianData } from './sources/obsidian'
export type { UpdatesData, UpdatesPackage } from './sources/updates'

import type { CodemetaData } from './sources/codemeta'
import type { GitData } from './sources/git'
import type { GitHubData } from './sources/github'
import type { LocData } from './sources/loc'
import type { MetascopeData } from './sources/metascope'
import type { NpmData } from './sources/npm'
import type { ObsidianData } from './sources/obsidian'
import type { UpdatesData } from './sources/updates'

// ── Aggregate Context ──────────────────────────────────

/**
 * The complete metadata context assembled from all sources.
 * Each key corresponds to a metadata source.
 */
export type MetadataContext = {
	codemeta: CodemetaData
	git: GitData
	github: GitHubData
	loc: LocData
	metascope: MetascopeData
	npm: NpmData
	obsidian: ObsidianData
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
	/** Named built-in preset. Ignored if `template` is provided. */
	preset?: string
	template?: never
}

/**
 * Options for `getMetadata` with a template (returns the template's return type).
 */
export type GetMetadataTemplateOptions<T> = {
	/** API credentials for remote sources. */
	credentials?: Credentials
	/** Project directory path. */
	path: string
	/** Named built-in preset. Ignored if `template` is provided. */
	preset?: string
	/** Custom template function. */
	template: Template<T>
}
