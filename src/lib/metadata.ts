import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import type {
	Credentials,
	GetMetadataOptions,
	GetMetadataTemplateOptions,
	MetadataContext,
	Template,
} from './metadata-types.js'
import type { MetadataSource, SourceContext } from './sources/source'
import type { TemplateMap, TemplateName } from './templates/index.js'
import { log } from './log'
import { arduinoLibraryPropertiesSource } from './sources/arduino-library-properties'
import { cinderCinderblockXmlSource } from './sources/cinder-cinderblock-xml'
import { codeStatisticsSource } from './sources/code-statistics'
import { codemetaJsonSource } from './sources/codemeta-json'
import { dependencyUpdatesSource } from './sources/dependency-updates'
import { filesystemSource } from './sources/filesystem'
import { gitConfigSource } from './sources/git-config'
import { gitStatisticsSource } from './sources/git-statistics'
import { githubSource } from './sources/github'
import { goGoModSource } from './sources/go-go-mod'
import { goGoreleaserYamlSource } from './sources/go-goreleaser-yaml'
import { javaPomXmlSource } from './sources/java-pom-xml'
import { licenseFileSource } from './sources/license-file'
import { metadataFileSource } from './sources/metadata-file'
import { metascopeSource } from './sources/metascope'
import { nodeNpmRegistrySource } from './sources/node-npm-registry'
import { nodePackageJsonSource } from './sources/node-package-json'
import { obsidianManifestJsonSource } from './sources/obsidian-manifest-json'
import { openframeworksAddonConfigMkSource } from './sources/openframeworks-addon-config-mk'
import { openframeworksInstallXmlSource } from './sources/openframeworks-install-xml'
import { processingLibraryPropertiesSource } from './sources/processing-library-properties'
import { publiccodeYamlSource } from './sources/publiccode-yaml'
import { pythonPkgInfoSource } from './sources/python-pkg-info'
import { pythonPypiRegistrySource } from './sources/python-pypi-registry'
import { pythonPyprojectTomlSource } from './sources/python-pyproject-toml'
import { pythonSetupCfgSource } from './sources/python-setup-cfg'
import { pythonSetupPySource } from './sources/python-setup-py'
import { readmeFileSource } from './sources/readme-file'
import { rubyGemspecSource } from './sources/ruby-gemspec'
import { rustCargoTomlSource } from './sources/rust-cargo-toml'
import { xcodeInfoPlistSource } from './sources/xcode-info-plist'
import { xcodeProjectPbxprojSource } from './sources/xcode-project-pbxproj'
import { stripUndefined } from './utilities/formatting'

const execFileAsync = promisify(execFile)

/**
 * All registered metadata sources, in execution order.
 * Codemeta is first because other sources depend on its output for discovery.
 */
const sources: MetadataSource[] = [
	arduinoLibraryPropertiesSource,
	rustCargoTomlSource,
	cinderCinderblockXmlSource,
	codemetaJsonSource,
	filesystemSource,
	rubyGemspecSource,
	gitConfigSource,
	gitStatisticsSource,
	githubSource,
	goGoModSource,
	goGoreleaserYamlSource,
	xcodeInfoPlistSource,
	licenseFileSource,
	codeStatisticsSource,
	metadataFileSource,
	metascopeSource,
	nodeNpmRegistrySource,
	obsidianManifestJsonSource,
	openframeworksAddonConfigMkSource,
	openframeworksInstallXmlSource,
	xcodeProjectPbxprojSource,
	pythonPkgInfoSource,
	nodePackageJsonSource,
	javaPomXmlSource,
	processingLibraryPropertiesSource,
	publiccodeYamlSource,
	readmeFileSource,
	pythonPypiRegistrySource,
	pythonPyprojectTomlSource,
	pythonSetupPySource,
	pythonSetupCfgSource,
	dependencyUpdatesSource,
]

/**
 * Resolve GitHub token from multiple sources, in precedence order.
 */
async function resolveCredentials(credentials?: Credentials): Promise<Credentials> {
	// Explicit credentials take priority
	if (credentials?.githubToken) return credentials

	// Environment variable
	const environmentToken = process.env.GITHUB_TOKEN
	if (environmentToken) return { ...credentials, githubToken: environmentToken }

	// Fall back to `gh auth token`
	try {
		const { stdout } = await execFileAsync('gh', ['auth', 'token'])
		const token = stdout.trim()
		if (token) return { ...credentials, githubToken: token }
	} catch {
		// Gh CLI not available or not authenticated
	}

	return credentials ?? {}
}

/**
 * Resolve a template option to a template function.
 * Accepts a built-in template name (string) or a template function.
 */
async function resolveTemplate(
	template: string | Template<unknown> | undefined,
): Promise<Template<unknown> | undefined> {
	if (template === undefined) return undefined
	if (typeof template === 'function') return template

	const { templates } = await import('./templates/index.js')

	if (template in templates) {
		return templates[template]
	}

	log.warn(`Unknown template: "${template}". Using default (all fields).`)
	return undefined
}

// Overload: built-in template name → mapped return type
export async function getMetadata<K extends TemplateName>(
	options: Omit<GetMetadataOptions, 'template'> & { template: K },
): Promise<TemplateMap[K]>
// Overload: template function → inferred return type
export async function getMetadata<T>(options: GetMetadataTemplateOptions<T>): Promise<T>
// Overload: no template → full context
export async function getMetadata(options: GetMetadataOptions): Promise<MetadataContext>
/**
 * Extract metadata from a project directory.
 */
export async function getMetadata<T>(
	options: GetMetadataOptions | GetMetadataTemplateOptions<T>,
): Promise<MetadataContext | T> {
	const startTime = performance.now()
	const absolutePath = resolve(options.path)

	// Validate that the target directory exists
	let stats: Awaited<ReturnType<typeof stat>>
	try {
		stats = await stat(absolutePath)
	} catch {
		throw new Error(`Path does not exist: ${absolutePath}`)
	}

	if (!stats.isDirectory()) {
		throw new Error(`Path is not a directory: ${absolutePath}`)
	}

	// Resolve template from options (built-in name or function)
	const template = await resolveTemplate(options.template)

	const credentials = await resolveCredentials(options.credentials)
	const sourceContext: SourceContext = { credentials, path: absolutePath }

	// Check availability of all sources in parallel
	log.debug('Checking source availability...')
	const availabilityResults = await Promise.all(
		sources.map(async (source) => {
			try {
				const available = await source.isAvailable(sourceContext)
				log.debug(`Source "${source.key}": ${available ? 'available' : 'not available'}`)
				return { available, source }
			} catch (error) {
				log.warn(
					`Source "${source.key}" availability check failed: ${error instanceof Error ? error.message : String(error)}`,
				)
				return { available: false, source }
			}
		}),
	)

	const availableSources = availabilityResults
		.filter((result) => result.available)
		.map((result) => result.source)

	// Extract data from available sources in parallel
	log.debug(`Extracting from ${availableSources.length} available sources...`)
	const extractResults = await Promise.all(
		availableSources.map(async (source) => {
			try {
				const startTime = performance.now()
				const data = await source.extract(sourceContext)
				const duration = Math.round(performance.now() - startTime)
				log.debug(`Source "${source.key}" extracted in ${duration}ms`)
				return { data, key: source.key }
			} catch (error) {
				log.warn(
					`Source "${source.key}" extraction failed: ${error instanceof Error ? error.message : String(error)}`,
				)
				return { data: {}, key: source.key }
			}
		}),
	)

	// Assemble context
	const context: MetadataContext = {
		arduinoLibraryProperties: undefined,
		cinderCinderblockXml: undefined,
		codemetaJson: undefined,
		codeStatistics: undefined,
		dependencyUpdates: undefined,
		filesystem: undefined,
		gitConfig: undefined,
		gitStatistics: undefined,
		github: undefined,
		goGoMod: undefined,
		goGoreleaserYaml: undefined,
		javaPomXml: undefined,
		licenseFiles: [],
		metadataFile: undefined,
		metascope: undefined,
		nodeNpmRegistry: undefined,
		nodePackageJson: undefined,
		obsidianManifestJson: undefined,
		openframeworksAddonConfigMk: undefined,
		openframeworksInstallXml: undefined,
		processingLibraryProperties: undefined,
		publiccodeYaml: undefined,
		pythonPkgInfo: undefined,
		pythonPypiRegistry: undefined,
		pythonPyprojectToml: undefined,
		pythonSetupCfg: undefined,
		pythonSetupPy: undefined,
		readmeFile: undefined,
		rubyGemspec: undefined,
		rustCargoToml: undefined,
		xcodeInfoPlist: undefined,
		xcodeProjectPbxproj: undefined,
	}

	for (const result of extractResults) {
		// Key and data are correlated but TypeScript can't narrow the union
		Object.assign(context, { [result.key]: result.data })
	}

	// Inject total scan duration into metascope data
	if (context.metascope) {
		context.metascope.data.durationMs = Math.round(performance.now() - startTime)
	}

	// Apply template if provided (pass raw context so all source keys exist)
	if (template) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion -- Template return type T is guaranteed by the overload signatures
		return (stripUndefined(template(context, options.templateData ?? {})) ?? {}) as unknown as T
	}

	// Strip undefined values and empty source objects from raw output
	return stripUndefined(context)
}
