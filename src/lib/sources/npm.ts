import packageJson from 'package-json'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type NpmData = {
	dependentCount?: number
	deprecated?: string
	downloadsMonthly?: number
	downloadsTotal?: number
	downloadsWeekly?: number
	downloadsYearly?: number
	fileCount?: number
	hasTypes?: boolean
	publishDateLatest?: string
	unpackedSizeBytes?: number
	versionLatest?: string
}

const npmDownloadsSchema = z.object({
	downloads: z.number(),
})

function getPackageName(context: SourceContext): string | undefined {
	const name = context.codemeta?.name
	if (!name) return undefined
	if (Array.isArray(name)) {
		const first = name[0]
		return typeof first === 'string' ? first : undefined
	}

	return typeof name === 'string' ? name : undefined
}

async function fetchDownloads(packageName: string, period: string): Promise<number | undefined> {
	try {
		// eslint-disable-next-line node/no-unsupported-features/node-builtins
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

export const npmSource: MetadataSource<'npm'> = {
	async fetch(context: SourceContext): Promise<NpmData> {
		log.debug('Fetching npm metadata...')
		const name = getPackageName(context)
		if (!name) return {}

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

		if (!metadata) return {}

		// Check for TypeScript types
		const hasTypes = Boolean(
			metadata.types ?? metadata.typings ?? (metadata as Record<string, unknown>).exports,
		)

		const distribution = metadata.dist as Record<string, unknown> | undefined
		const time = metadata.time as Record<string, string> | undefined

		return {
			deprecated: typeof metadata.deprecated === 'string' ? metadata.deprecated : undefined,
			downloadsMonthly,
			downloadsTotal,
			downloadsWeekly,
			downloadsYearly,
			fileCount: typeof distribution?.fileCount === 'number' ? distribution.fileCount : undefined,
			hasTypes,
			publishDateLatest: time?.modified,
			unpackedSizeBytes:
				typeof distribution?.unpackedSize === 'number' ? distribution.unpackedSize : undefined,
			versionLatest: metadata.version,
		}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const name = getPackageName(context)
		if (!name) return false

		try {
			await packageJson(name, { fullMetadata: false })
			return true
		} catch {
			return false
		}
	},
	key: 'npm',
}
