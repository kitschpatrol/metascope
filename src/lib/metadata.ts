import { defu } from 'defu'
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import prettyMs from 'pretty-ms'
import type {
	Credentials,
	GetMetadataOptions,
	GetMetadataTemplateOptions,
	MetadataContext,
	Template,
} from './metadata-types.js'
import type { MetadataSource, SourceContext } from './source.js'
import type { TemplateMap, TemplateName } from './templates/index.js'
import { getTree, resetMatchCache } from './file-matching.js'
import { log } from './log'
import { DEFAULT_GET_METADATA_OPTIONS } from './metadata-types.js'
import { arduinoLibraryPropertiesSource } from './sources/arduino-library-properties'
import { cinderCinderblockXmlSource } from './sources/cinder-cinderblock-xml'
import { codeStatisticsSource } from './sources/code-statistics'
import { codemetaJsonSource } from './sources/codemeta-json'
import { dependencyUpdatesSource } from './sources/dependency-updates'
import { fileStatisticsSource } from './sources/file-statistics'
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
import { obsidianPluginManifestJsonSource } from './sources/obsidian-plugin-manifest-json'
import { obsidianPluginRegistrySource } from './sources/obsidian-plugin-registry'
import { openframeworksAddonConfigMkSource } from './sources/openframeworks-addon-config-mk'
import { openframeworksInstallXmlSource } from './sources/openframeworks-install-xml'
import { processingLibraryPropertiesSource } from './sources/processing-library-properties'
import { processingSketchPropertiesSource } from './sources/processing-sketch-properties'
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
import { isKeyOfTemplate, templates } from './templates/index.js'
import { stripUndefined } from './utilities/formatting'

const execFileAsync = promisify(execFile)

/**
 * All registered metadata sources.
 * Each source declares its `phase` number. Sources with the same phase run in parallel.
 * Lower phases run first, and their accumulated results are available to later phases
 * via `context` in `SourceContext`.
 */
const sources: MetadataSource[] = [
	// Phase 1: File sources — discover and extract config from the local file system
	arduinoLibraryPropertiesSource,
	cinderCinderblockXmlSource,
	codemetaJsonSource,
	gitConfigSource,
	goGoModSource,
	goGoreleaserYamlSource,
	javaPomXmlSource,
	licenseFileSource,
	metadataFileSource,
	metascopeSource,
	nodePackageJsonSource,
	obsidianPluginManifestJsonSource,
	openframeworksAddonConfigMkSource,
	openframeworksInstallXmlSource,
	processingLibraryPropertiesSource,
	processingSketchPropertiesSource,
	publiccodeYamlSource,
	pythonPkgInfoSource,
	pythonPyprojectTomlSource,
	pythonSetupCfgSource,
	pythonSetupPySource,
	readmeFileSource,
	rubyGemspecSource,
	rustCargoTomlSource,
	xcodeInfoPlistSource,
	xcodeProjectPbxprojSource,
	// Phase 2: Tool sources — run local tools or fetch from remote APIs
	codeStatisticsSource,
	dependencyUpdatesSource,
	fileStatisticsSource,
	gitStatisticsSource,
	githubSource,
	nodeNpmRegistrySource,
	obsidianPluginRegistrySource,
	pythonPypiRegistrySource,
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
function resolveTemplate(
	template: string | Template<unknown> | undefined,
): Template<unknown> | undefined {
	if (template === undefined) return undefined
	if (typeof template === 'function') return template

	if (isKeyOfTemplate(template)) {
		return templates[template]
	}

	log.warn(`Unknown template: "${template}". Using default (all fields).`)
	return undefined
}

/**
 * Check availability and extract data from a set of sources in parallel,
 * writing results into the provided MetadataContext.
 */
async function runSources(
	phaseSources: MetadataSource[],
	sourceContext: SourceContext,
	result: MetadataContext,
): Promise<void> {
	const extractResults = await Promise.all(
		phaseSources.map(async (source) => {
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
				return { data: undefined, key: source.key }
			}
		}),
	)

	for (const entry of extractResults) {
		if (entry.data !== undefined) {
			// Key and data are correlated but TypeScript can't narrow the union
			Object.assign(result, { [entry.key]: entry.data })
		}
	}
}

type PartialPath<T> = Omit<T, 'path'> & { path?: string }

// Overload: built-in template name → mapped return type
export async function getMetadata<K extends TemplateName>(
	options: PartialPath<Omit<GetMetadataOptions, 'template'> & { template: K }>,
): Promise<TemplateMap[K]>
// Overload: template function → inferred return type
export async function getMetadata<T>(
	options: PartialPath<GetMetadataTemplateOptions<T>>,
): Promise<T>
// Overload: no template → full context
export async function getMetadata(
	options?: PartialPath<GetMetadataOptions>,
): Promise<MetadataContext>
/**
 * Extract metadata from a project directory.
 */
export async function getMetadata<T>(
	options?: PartialPath<GetMetadataOptions> | PartialPath<GetMetadataTemplateOptions<T>>,
): Promise<MetadataContext | T> {
	const startTime = performance.now()

	const resolvedOptions = defu(options ?? {}, DEFAULT_GET_METADATA_OPTIONS)
	const absolutePath = resolve(resolvedOptions.path)

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
	const template = resolveTemplate(resolvedOptions.template)

	const credentials = await resolveCredentials(resolvedOptions.credentials)

	// Reset match cache to ensure fresh results for each getMetadata call
	resetMatchCache()

	// Warm the memoized file tree cache (sources access it via getMatches).
	// Only cache the tree — don't materialize a full results array to avoid OOM on large repos.
	log.debug(`Building file tree (respectIgnored: ${resolvedOptions.respectIgnored})...`)
	const rootTree = await getTree(absolutePath, resolvedOptions.respectIgnored)
	log.debug(`Root file tree contains ${rootTree.length} entries`)

	// Assemble context with defaults
	const context: MetadataContext = {
		arduinoLibraryProperties: undefined,
		cinderCinderblockXml: undefined,
		codemetaJson: undefined,
		codeStatistics: undefined,
		dependencyUpdates: undefined,
		fileStatistics: undefined,
		gitConfig: undefined,
		github: undefined,
		gitStatistics: undefined,
		goGoMod: undefined,
		goGoreleaserYaml: undefined,
		javaPomXml: undefined,
		licenseFiles: undefined,
		metadataFile: undefined,
		metascope: undefined,
		nodeNpmRegistry: undefined,
		nodePackageJson: undefined,
		obsidianPluginManifestJson: undefined,
		obsidianPluginRegistry: undefined,
		openframeworksAddonConfigMk: undefined,
		openframeworksInstallXml: undefined,
		processingLibraryProperties: undefined,
		processingSketchProperties: undefined,
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

	// Group sources by phase and run each phase sequentially.
	// Within a phase, all sources run in parallel.
	// Each phase receives the accumulated context from all previous phases.
	const phases = new Set(sources.map((s) => s.phase))
	for (const phase of [...phases].toSorted((a, b) => a - b)) {
		const phaseSources = sources.filter((s) => s.phase === phase)
		log.debug(`Phase ${phase}: Running ${phaseSources.length} sources...`)
		const sourceContext: SourceContext = {
			metadata: { ...context },
			options: {
				...resolvedOptions,
				credentials,
				path: absolutePath,
			},
		}
		await runSources(phaseSources, sourceContext, context)
	}

	const metadataDuration = performance.now() - startTime
	if (context.metascope) {
		context.metascope.data.durationMs = Math.round(metadataDuration)
	}

	log.info(`Metadata duration: ${prettyMs(metadataDuration)}`)

	// Apply template if provided (pass raw context so all source keys exist)
	if (template) {
		const templateStartTime = performance.now()
		// eslint-disable-next-line ts/no-unsafe-type-assertion -- Template return type T is guaranteed by the overload signatures
		const finalTemplateResult = (stripUndefined(
			template(context, resolvedOptions.templateData ?? {}),
		) ?? {}) as unknown as T
		const templateDuration = performance.now() - templateStartTime
		log.info(`Template duration: ${prettyMs(templateDuration)}`)
		log.info(`Total duration: ${prettyMs(performance.now() - startTime)}`)
		return finalTemplateResult
	}

	// Strip undefined values and empty source objects from raw output
	const finalResult = stripUndefined(context)
	log.info(`Total duration: ${prettyMs(performance.now() - startTime)}`)
	return finalResult
}
