import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import type { MetadataSource, SourceContext } from './sources/source'
import type {
	Credentials,
	GetMetadataOptions,
	GetMetadataTemplateOptions,
	MetadataContext,
	Template,
} from './types'
import { log } from './log'
import { codemetaSource } from './sources/codemeta'
import { gitSource } from './sources/git'
import { githubSource } from './sources/github'
import { locSource } from './sources/loc'
import { metascopeSource } from './sources/metascope'
import { npmSource } from './sources/npm'
import { obsidianSource } from './sources/obsidian'
import { updatesSource } from './sources/updates'
import { stripUndefined } from './utilities'

const execFileAsync = promisify(execFile)

/**
 * All registered metadata sources, in execution order.
 * Codemeta is first because other sources depend on its output for discovery.
 */
const sources: MetadataSource[] = [
	codemetaSource,
	gitSource,
	githubSource,
	locSource,
	metascopeSource,
	npmSource,
	obsidianSource,
	updatesSource,
]

/**
 * Resolve GitHub token from multiple sources, in precedence order.
 */
async function resolveCredentials(credentials?: Credentials): Promise<Credentials> {
	// Explicit credentials take priority
	if (credentials?.githubToken) return credentials

	// Environment variable
	const envToken = process.env.GITHUB_TOKEN
	if (envToken) return { ...credentials, githubToken: envToken }

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
 * Resolve a preset name to a template function.
 */
async function resolvePreset(presetName: string): Promise<Template<unknown> | undefined> {
	const { presets } = await import('./presets/index.js')
	const preset = presets[presetName]
	if (!preset) {
		log.warn(`Unknown preset: "${presetName}". Using default (all fields).`)
		return undefined
	}

	return preset
}

// Overload: no template → full context
export async function getMetadata(options: GetMetadataOptions): Promise<MetadataContext>
// Overload: with template → inferred return type
export async function getMetadata<T>(options: GetMetadataTemplateOptions<T>): Promise<T>
/**
 * Extract metadata from a project directory.
 */
export async function getMetadata<T>(
	options: GetMetadataOptions | GetMetadataTemplateOptions<T>,
): Promise<MetadataContext | T> {
	const startTime = Date.now()
	const absolutePath = resolve(options.path)

	// Resolve template from options or preset
	let template: Template<unknown> | undefined = options.template as Template<unknown> | undefined
	if (!template && options.preset) {
		template = await resolvePreset(options.preset)
	}

	const credentials = await resolveCredentials(options.credentials)

	// Phase 1: Always fetch codemeta first (provides discovery hints)
	log.debug('Phase 1: Fetching codemeta for discovery hints...')
	const codemetaContext: SourceContext = { credentials, path: absolutePath }
	// Fallback empty codemeta if source fails; required fields are provided as empty defaults
	let codemetaData: MetadataContext['codemeta'] = {
		'@context': 'https://w3id.org/codemeta/3.1',
		'@type': 'SoftwareSourceCode',
	}
	try {
		codemetaData = await codemetaSource.fetch(codemetaContext)
	} catch (error) {
		log.warn(`Codemeta source failed: ${error instanceof Error ? error.message : String(error)}`)
	}

	// Phase 2: Check availability and fetch remaining sources in parallel
	const remainingSources = sources.filter((source) => source.key !== 'codemeta')
	const sourceContext: SourceContext = { codemeta: codemetaData, credentials, path: absolutePath }

	log.debug('Phase 2: Checking source availability...')
	const availabilityResults = await Promise.all(
		remainingSources.map(async (source) => {
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

	// Phase 3: Fetch data from available sources in parallel
	log.debug(`Phase 3: Fetching from ${availableSources.length} available sources...`)
	const fetchResults = await Promise.all(
		availableSources.map(async (source) => {
			try {
				const startTime = Date.now()
				const data = await source.fetch(sourceContext)
				const duration = Date.now() - startTime
				log.debug(`Source "${source.key}" fetched in ${duration}ms`)
				return { data, key: source.key }
			} catch (error) {
				log.warn(
					`Source "${source.key}" fetch failed: ${error instanceof Error ? error.message : String(error)}`,
				)
				return { data: {}, key: source.key }
			}
		}),
	)

	// Assemble context
	const context: MetadataContext = {
		codemeta: codemetaData,
		git: {},
		github: {},
		loc: {},
		metascope: {},
		npm: {},
		obsidian: {},
		updates: {},
	}

	for (const result of fetchResults) {
		// Key and data are correlated but TypeScript can't narrow the union
		Object.assign(context, { [result.key]: result.data })
	}

	// Inject total scan duration into metascope data
	context.metascope.durationMs = Date.now() - startTime

	// Apply template if provided (pass raw context so all source keys exist)
	if (template) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion -- Template return type T is guaranteed by the overload signatures
		return (stripUndefined(template(context)) ?? {}) as unknown as T
	}

	// Strip undefined values and empty source objects from raw output
	return stripUndefined(context)
}
