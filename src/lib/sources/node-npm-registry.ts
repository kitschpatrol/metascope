import is from '@sindresorhus/is'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import packageJson from 'package-json'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseJsonRecord } from '../utilities/schema-primitives'

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

export type NodeNpmRegistryData = SourceRecord<NodeNpmRegistryInfo> | undefined

const npmDownloadsSchema = z.object({
	downloads: z.number(),
})

async function getPackageName(context: SourceContext): Promise<string | undefined> {
	try {
		const content = await readFile(resolve(context.path, 'package.json'), 'utf8')
		const packageContent = parseJsonRecord(content)
		return typeof packageContent?.name === 'string' ? packageContent.name : undefined
	} catch {
		return undefined
	}
}

async function fetchDownloads(packageName: string, period: string): Promise<number | undefined> {
	try {
		const response = await fetch(
			`https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(packageName)}`,
		)
		if (!response.ok) return undefined
		const data = npmDownloadsSchema.parse(await response.json())
		return data.downloads
	} catch {
		return undefined
	}
}

export const nodeNpmRegistrySource: MetadataSource<'nodeNpmRegistry'> = {
	async extract(context: SourceContext): Promise<NodeNpmRegistryData> {
		log.debug('Extracting npm metadata...')
		const name = await getPackageName(context)
		if (!name) return undefined

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

		if (!metadata) return undefined

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
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(resolve(context.path, 'package.json'))
		} catch {
			return false
		}

		const name = await getPackageName(context)
		if (!name) return false

		try {
			await packageJson(name, { fullMetadata: false })
			return true
		} catch {
			return false
		}
	},
	key: 'nodeNpmRegistry',
}
