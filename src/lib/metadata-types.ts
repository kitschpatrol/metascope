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
import type { ObsidianPluginManifestJsonData } from './sources/obsidian-plugin-manifest-json'
import type { ObsidianPluginRegistryData } from './sources/obsidian-plugin-registry'
import type { OpenframeworksAddonConfigMkData } from './sources/openframeworks-addon-config-mk'
import type { OpenframeworksInstallXmlData } from './sources/openframeworks-install-xml'
import type { ProcessingLibraryPropertiesData } from './sources/processing-library-properties'
import type { ProcessingSketchPropertiesData } from './sources/processing-sketch-properties'
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
	obsidianPluginManifestJson: ObsidianPluginManifestJsonData
	obsidianPluginRegistry: ObsidianPluginRegistryData
	openframeworksAddonConfigMk: OpenframeworksAddonConfigMkData
	openframeworksInstallXml: OpenframeworksInstallXmlData
	processingLibraryProperties: ProcessingLibraryPropertiesData
	processingSketchProperties: ProcessingSketchPropertiesData
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
 * Base options shared by all `getMetadata` overloads.
 */
export type GetMetadataBaseOptions = {
	/** When true (the default), all paths in the output (source, workspaceDirectories, etc.) are absolute. When false, paths are relative to the project directory. */
	absolute?: boolean
	/** API credentials for remote sources. */
	credentials?: Credentials
	/** Skip web sources (npm registry, GitHub API, PyPI, etc.). */
	offline?: boolean
	/** Project directory path. Defaults to `'.'` (resolved to `process.cwd()` via `path.resolve`). */
	path: string
	/** Search for metadata files recursively in subdirectories. Defaults to false. */
	recursive?: boolean
	/** Ignore files specified .gitignore in the file tree. Defaults to true. */
	respectIgnored?: boolean
	/** User-supplied data passed to templates. */
	templateData?: TemplateData
	/**
	 * Directories to any monorepo workspaces... only supports yarn, npm, pnpm, lerna, and bolt at the moment
	 * Never includes the root path!
	 * False is disable, true is auto-discover which turns into string[], string[] is manual list relative to the project directory path...
	 */
	workspaces?: boolean | string[]
}

/**
 * Default values for optional fields in `GetMetadataBaseOptions`.
 */
export const DEFAULT_GET_METADATA_OPTIONS: Required<
	Omit<GetMetadataBaseOptions, 'credentials' | 'templateData'>
> = {
	absolute: true,
	offline: false,
	path: '.',
	recursive: false,
	respectIgnored: true,
	workspaces: true,
}

/**
 * Options for `getMetadata` without a template (returns full `MetadataContext`).
 */
export type GetMetadataOptions = GetMetadataBaseOptions & {
	/** Built-in template name or omit for full output. */
	template?: 'frontmatter' | 'project' | (string & {})
}

/**
 * Options for `getMetadata` with a template function (returns the template's return type).
 */
export type GetMetadataTemplateOptions<T> = GetMetadataBaseOptions & {
	/** Template function that transforms MetadataContext into a custom shape. */
	template: Template<T>
}
