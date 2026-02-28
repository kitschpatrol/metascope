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
import { packageSource } from './sources/package-json.js'
import { pypiSource } from './sources/pypi'
import { pyprojectSource } from './sources/pyproject-toml.js'
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
	packageSource,
	pypiSource,
	pyprojectSource,
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
 * Resolve a template option to a template function.
 * Accepts a built-in template name (string) or a template function.
 */
async function resolveTemplate(
	template: string | Template<unknown> | undefined,
): Promise<Template<unknown> | undefined> {
	if (template === undefined) return undefined
	if (typeof template === 'function') return template

	const { templates } = await import('./templates/index.js')
	const builtIn = templates[template]
	if (!builtIn) {
		log.warn(`Unknown template: "${template}". Using default (all fields).`)
		return undefined
	}

	return builtIn
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

	// Resolve template from options (built-in name or function)
	const template = await resolveTemplate(options.template as string | Template<unknown> | undefined)

	const credentials = await resolveCredentials(options.credentials)

	// Phase 1: Always extract codemeta first (provides discovery hints)
	log.debug('Phase 1: Extracting codemeta for discovery hints...')
	const codemetaContext: SourceContext = { credentials, path: absolutePath }
	// Fallback empty codemeta if source fails
	let codemetaData: MetadataContext['codemeta'] = {}
	try {
		codemetaData = await codemetaSource.extract(codemetaContext)
	} catch (error) {
		log.warn(`Codemeta source failed: ${error instanceof Error ? error.message : String(error)}`)
	}

	// Phase 2: Check availability and extract remaining sources in parallel
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

	// Phase 3: Extract data from available sources in parallel
	log.debug(`Phase 3: Extracting from ${availableSources.length} available sources...`)
	const extractResults = await Promise.all(
		availableSources.map(async (source) => {
			try {
				const startTime = Date.now()
				const data = await source.extract(sourceContext)
				const duration = Date.now() - startTime
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
		codemeta: codemetaData,
		git: {},
		github: {},
		loc: {},
		metascope: {},
		npm: {},
		obsidian: {},
		packageJson: {},
		pypi: {},
		pyprojectToml: {},
		updates: {},
	}

	for (const result of extractResults) {
		// Key and data are correlated but TypeScript can't narrow the union
		Object.assign(context, { [result.key]: result.data })
	}

	// Inject total scan duration into metascope data
	context.metascope.durationMs = Date.now() - startTime

	// Apply template if provided (pass raw context so all source keys exist)
	if (template) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion -- Template return type T is guaranteed by the overload signatures
		return (stripUndefined(template(context, options.templateData ?? {})) ?? {}) as unknown as T
	}

	// Strip undefined values and empty source objects from raw output
	return stripUndefined(context)
}
