import is from '@sindresorhus/is'
import packageJson from 'package-json'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'
import { fetchWithRetry } from '../utilities/fetch'
import { ensureArray } from '../utilities/template-helpers'
import { nodePackageJsonSource } from './node-package-json'

export type NodeNpmRegistryInfo = {
	/** Deprecation message, if the package is deprecated. */
	deprecated?: string
	/** Downloads in the last month. */
	downloadsMonthly?: number
	/** All-time total downloads. */
	downloadsTotal?: number
	/** Downloads in the last week. */
	downloadsWeekly?: number
	/** Downloads in the last year. */
	downloadsYearly?: number
	/** Number of files in the published package. */
	fileCount?: number
	/** Whether the package exposes TypeScript types. */
	hasTypes?: boolean
	/** ISO 8601 date the package was last published. */
	publishDateLatest?: string
	/** Unpacked size of the published package in bytes. */
	unpackedSizeBytes?: number
	/** The npmjs.com URL for the package. */
	url?: string
	/** Latest published version string. */
	versionLatest?: string
}

export type NodeNpmRegistryData = OneOrMany<SourceRecord<NodeNpmRegistryInfo>> | undefined

export const nodeNpmRegistrySource = defineSource<'nodeNpmRegistry'>({
	async discover(context) {
		if (context.options.offline) {
			log.warn("Skipping Node NPM registry data source since we're in offline mode")
			return []
		}

		// Try to get package name from context
		let packageNames = ensureArray(context.metadata?.nodePackageJson).map(
			(value) => value.data.name,
		)

		// Fall back to extracting it ourselves if the source hasn't run yet
		if (packageNames.length === 0 && !context.completedSources?.has('nodePackageJson')) {
			log.warn(
				`Missing nodePackageJson in source context metadata for ${context.options.path}, extracting it now...`,
			)
			const nodePackageJson = await nodePackageJsonSource.extract(context)
			packageNames = ensureArray(nodePackageJson).map((value) => value.data.name)
		}

		return packageNames
	},
	key: 'nodeNpmRegistry',
	async parse(input) {
		log.debug('Extracting npm metadata...')
		const name = input

		const [metadata, downloadsWeekly, downloadsMonthly, downloadsYearly, downloadsTotal] =
			await Promise.all([
				packageJson(name, { fullMetadata: true }).catch(
					// Return undefined if package metadata lookup fails
					(): undefined => undefined,
				),
				fetchDownloads(name, 'last-week'),
				fetchDownloads(name, 'last-month'),
				fetchDownloads(name, 'last-year'),
				// All-time downloads: NPM API supports a range from package creation to now
				fetchDownloads(name, '2005-01-01:3000-01-01'),
			])

		if (!metadata) return

		// Check for TypeScript types
		const hasTypes = Boolean(
			metadata.types ??
			metadata.typings ??
			(is.plainObject(metadata) ? metadata.exports : undefined),
		)

		const distribution = is.plainObject(metadata.dist) ? metadata.dist : undefined
		const time = is.plainObject(metadata.time) ? metadata.time : undefined

		return {
			data: {
				deprecated: typeof metadata.deprecated === 'string' ? metadata.deprecated : undefined,
				downloadsMonthly,
				// eslint-disable-next-line ts/prefer-nullish-coalescing
				downloadsTotal: downloadsTotal || undefined,
				downloadsWeekly,
				downloadsYearly,
				fileCount: typeof distribution?.fileCount === 'number' ? distribution.fileCount : undefined,
				hasTypes,
				publishDateLatest: typeof time?.modified === 'string' ? time.modified : undefined,
				unpackedSizeBytes:
					typeof distribution?.unpackedSize === 'number' ? distribution.unpackedSize : undefined,
				url: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
				versionLatest: metadata.version,
			},
			source: `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
		}
	},
	phase: 2,
})

// Helpers -----------------------

const npmDownloadsSchema = z.object({
	downloads: z.number(),
})

async function fetchDownloads(packageName: string, period: string): Promise<number | undefined> {
	try {
		const response = await fetchWithRetry(
			`https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(packageName)}`,
		)
		if (!response.ok) return undefined
		const data = npmDownloadsSchema.parse(await response.json())
		return data.downloads
	} catch {
		return undefined
	}
}
