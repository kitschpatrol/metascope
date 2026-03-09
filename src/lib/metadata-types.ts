export type { ArduinoLibraryPropertiesData } from './sources/arduino-library-properties'
export type { CinderCinderblockXmlData } from './sources/cinder-cinderblock-xml'
export type { CodeStatisticsData } from './sources/code-statistics'
export type { CodeMetaJsonData } from './sources/codemeta-json'
export type { DependencyUpdatesData, DependencyUpdatesPackage } from './sources/dependency-updates'
export type { FileStatisticsData } from './sources/file-statistics'
export type { GitConfigData } from './sources/git-config'
export type { GitStatisticsData } from './sources/git-statistics'
export type { GitHubData } from './sources/github'
export type { GoGoModData } from './sources/go-go-mod'
export type { GoGoreleaserYamlData } from './sources/go-goreleaser-yaml'
export type { JavaPomXmlData } from './sources/java-pom-xml'
export type { LicenseFilesData } from './sources/license-file'
export type { MetadataFileData } from './sources/metadata-file'
export type { MetascopeData } from './sources/metascope'
export type { NodeNpmRegistryData } from './sources/node-npm-registry'
export type { NodePackageJsonData } from './sources/node-package-json'
export type { ObsidianManifest, ObsidianManifestJsonData } from './sources/obsidian-manifest-json'
export type { OpenframeworksAddonConfigMkData } from './sources/openframeworks-addon-config-mk'
export type { OpenframeworksInstallXmlData } from './sources/openframeworks-install-xml'
export type { ProcessingLibraryPropertiesData } from './sources/processing-library-properties'
export type { PubliccodeYamlData } from './sources/publiccode-yaml'
export type { PythonPkgInfoData } from './sources/python-pkg-info'
export type { PythonPypiRegistryData } from './sources/python-pypi-registry'
export type { PythonPyprojectTomlData } from './sources/python-pyproject-toml'
export type { PythonSetupCfgData } from './sources/python-setup-cfg'
export type { PythonSetupPyData } from './sources/python-setup-py'
export type { ReadmeFileData } from './sources/readme-file'
export type { RubyGemspecData } from './sources/ruby-gemspec'
export type { RustCargoTomlData } from './sources/rust-cargo-toml'
export type { SourceRecord } from './sources/source'
export type { XcodeInfoPlistData } from './sources/xcode-info-plist'
export type { XcodeProjectPbxprojData } from './sources/xcode-project-pbxproj'

import type { ArduinoLibraryPropertiesData } from './sources/arduino-library-properties'
import type { CinderCinderblockXmlData } from './sources/cinder-cinderblock-xml'
import type { CodeStatisticsData } from './sources/code-statistics'
import type { CodeMetaJsonData } from './sources/codemeta-json'
import type { DependencyUpdatesData } from './sources/dependency-updates'
import type { FileStatisticsData } from './sources/file-statistics'
import type { GitConfigData } from './sources/git-config'
import type { GitStatisticsData } from './sources/git-statistics'
import type { GitHubData } from './sources/github'
import type { GoGoModData } from './sources/go-go-mod'
import type { GoGoreleaserYamlData } from './sources/go-goreleaser-yaml'
import type { JavaPomXmlData } from './sources/java-pom-xml'
import type { LicenseFilesData } from './sources/license-file'
import type { MetadataFileData } from './sources/metadata-file'
import type { MetascopeData } from './sources/metascope'
import type { NodeNpmRegistryData } from './sources/node-npm-registry'
import type { NodePackageJsonData } from './sources/node-package-json'
import type { ObsidianManifestJsonData } from './sources/obsidian-manifest-json'
import type { OpenframeworksAddonConfigMkData } from './sources/openframeworks-addon-config-mk'
import type { OpenframeworksInstallXmlData } from './sources/openframeworks-install-xml'
import type { ProcessingLibraryPropertiesData } from './sources/processing-library-properties'
import type { PubliccodeYamlData } from './sources/publiccode-yaml'
import type { PythonPkgInfoData } from './sources/python-pkg-info'
import type { PythonPypiRegistryData } from './sources/python-pypi-registry'
import type { PythonPyprojectTomlData } from './sources/python-pyproject-toml'
import type { PythonSetupCfgData } from './sources/python-setup-cfg'
import type { PythonSetupPyData } from './sources/python-setup-py'
import type { ReadmeFileData } from './sources/readme-file'
import type { RubyGemspecData } from './sources/ruby-gemspec'
import type { RustCargoTomlData } from './sources/rust-cargo-toml'
import type { XcodeInfoPlistData } from './sources/xcode-info-plist'
import type { XcodeProjectPbxprojData } from './sources/xcode-project-pbxproj'

// ── Aggregate Context ──────────────────────────────────

/**
 * The complete metadata context assembled from all sources.
 * Each key corresponds to a metadata source.
 */
export type MetadataContext = {
	arduinoLibraryProperties: ArduinoLibraryPropertiesData
	cinderCinderblockXml: CinderCinderblockXmlData
	codemetaJson: CodeMetaJsonData
	codeStatistics: CodeStatisticsData
	dependencyUpdates: DependencyUpdatesData
	fileStatistics: FileStatisticsData
	gitConfig: GitConfigData
	github: GitHubData
	gitStatistics: GitStatisticsData
	goGoMod: GoGoModData
	goGoreleaserYaml: GoGoreleaserYamlData
	javaPomXml: JavaPomXmlData
	licenseFiles: LicenseFilesData
	metadataFile: MetadataFileData
	metascope: MetascopeData
	nodeNpmRegistry: NodeNpmRegistryData
	nodePackageJson: NodePackageJsonData
	obsidianManifestJson: ObsidianManifestJsonData
	openframeworksAddonConfigMk: OpenframeworksAddonConfigMkData
	openframeworksInstallXml: OpenframeworksInstallXmlData
	processingLibraryProperties: ProcessingLibraryPropertiesData
	publiccodeYaml: PubliccodeYamlData
	pythonPkgInfo: PythonPkgInfoData
	pythonPypiRegistry: PythonPypiRegistryData
	pythonPyprojectToml: PythonPyprojectTomlData
	pythonSetupCfg: PythonSetupCfgData
	pythonSetupPy: PythonSetupPyData
	readmeFile: ReadmeFileData
	rubyGemspec: RubyGemspecData
	rustCargoToml: RustCargoTomlData
	xcodeInfoPlist: XcodeInfoPlistData
	xcodeProjectPbxproj: XcodeProjectPbxprojData
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
 * export default defineTemplate(({ codemetaJson, github }) => ({
 *   name: codemetaJson?.data.name,
 *   stars: github?.data.stargazerCount,
 * }))
 * ```
 */
export function defineTemplate<T>(transform: Template<T>): Template<T> {
	return transform
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
	/** Skip web sources (npm registry, GitHub API, PyPI, etc.). */
	offline?: boolean
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
	/** Skip web sources (npm registry, GitHub API, PyPI, etc.). */
	offline?: boolean
	/** Project directory path. */
	path: string
	/** Template function that transforms MetadataContext into a custom shape. */
	template: Template<T>
	/** User-supplied data passed to templates. */
	templateData?: TemplateData
}
