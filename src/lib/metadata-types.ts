export type {
	ArduinoLibraryPropertiesCategory,
	ArduinoLibraryPropertiesData,
	ArduinoLibraryPropertiesDependencyEntry,
	ArduinoLibraryPropertiesPersonEntry,
} from './sources/arduino-library-properties'
export type {
	CargoTomlAuthorEntry,
	CargoTomlData,
	CargoTomlDependencyEntry,
} from './sources/cargo-toml'
export type { CinderCinderblockData } from './sources/cinder-cinderblock'
export type { CodeMetaData } from './sources/codemeta'
export type { FilesystemData } from './sources/filesystem'
export type { GitConfig, GitData } from './sources/git'
export type { GitHubData } from './sources/github'
export type { LocData, LocTotals } from './sources/loc'
export type { MetascopeData } from './sources/metascope'
export type { NpmData } from './sources/npm'
export type { ObsidianData, ObsidianManifest } from './sources/obsidian'
export type { OpenFrameworksAddonConfigData } from './sources/open-frameworks-addon-config'
export type { PackageData } from './sources/package-json'
export type {
	ProcessingLibraryPropertiesAuthorEntry,
	ProcessingLibraryPropertiesCategory,
	ProcessingLibraryPropertiesData,
} from './sources/processing-library-properties'
export type { PypiData } from './sources/pypi'
export type { PyprojectData } from './sources/pyproject-toml'
export type { UpdatesData, UpdatesPackage } from './sources/updates'

import type { ArduinoLibraryPropertiesData } from './sources/arduino-library-properties'
import type { CargoTomlData } from './sources/cargo-toml'
import type { CinderCinderblockData } from './sources/cinder-cinderblock'
import type { CodeMetaData } from './sources/codemeta'
import type { FilesystemData } from './sources/filesystem'
import type { GitData } from './sources/git'
import type { GitHubData } from './sources/github'
import type { LocData } from './sources/loc'
import type { MetascopeData } from './sources/metascope'
import type { NpmData } from './sources/npm'
import type { ObsidianData } from './sources/obsidian'
import type { OpenFrameworksAddonConfigData } from './sources/open-frameworks-addon-config'
import type { PackageData } from './sources/package-json'
import type { ProcessingLibraryPropertiesData } from './sources/processing-library-properties'
import type { PypiData } from './sources/pypi'
import type { PyprojectData } from './sources/pyproject-toml'
import type { UpdatesData } from './sources/updates'

// ── Aggregate Context ──────────────────────────────────

/**
 * The complete metadata context assembled from all sources.
 * Each key corresponds to a metadata source.
 */
export type MetadataContext = {
	arduinoLibraryProperties: ArduinoLibraryPropertiesData
	cargoToml: CargoTomlData
	cinderCinderblock: CinderCinderblockData
	codemeta: CodeMetaData
	filesystem: FilesystemData
	git: GitData
	github: GitHubData
	loc: LocData
	metascope: MetascopeData
	npm: NpmData
	obsidian: ObsidianData
	openFrameworksAddonConfig: OpenFrameworksAddonConfigData
	packageJson: PackageData
	processingLibraryProperties: ProcessingLibraryPropertiesData
	pypi: PypiData
	pyprojectToml: PyprojectData
	updates: UpdatesData
}

/**
 * The name of a metadata source.
 */
export type SourceName = keyof MetadataContext

// ── Template ───────────────────────────────────────────

/**
 * User-supplied data passed to templates for parameterized ownership checks.
 * All fields are optional; templates that don't need them can ignore the argument.
 */
export type TemplateData = {
	[key: string]: unknown
	authorName?: string | string[]
	githubAccount?: string | string[]
}

/**
 * A template function that transforms MetadataContext into a custom shape.
 * The optional second argument provides user-supplied template data.
 */
export type Template<T> = (context: MetadataContext, templateData: TemplateData) => T

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
	/** Built-in template name or omit for full output. */
	template?: 'frontmatter' | 'project' | (string & {})
	/** User-supplied data passed to templates. */
	templateData?: TemplateData
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
	/** User-supplied data passed to templates. */
	templateData?: TemplateData
}
