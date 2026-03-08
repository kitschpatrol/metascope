import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseJsonRecord } from '../utilities/schema-primitives'

export type ObsidianManifest = {
	/** Plugin author name. */
	author?: string
	/** URL for the plugin author. */
	authorUrl?: string
	/** Plugin description. */
	description?: string
	/** URL for funding or sponsorship. */
	fundingUrl?: string
	/** Unique plugin identifier. */
	id: string
	/** Whether the plugin is desktop-only. */
	isDesktopOnly?: boolean
	/** Minimum Obsidian app version required. */
	minAppVersion?: string
	/** Display name of the plugin. */
	name?: string
	/** Plugin version string. */
	version?: string
}

export type ObsidianData = {
	/** Total community download count. */
	downloadCount?: number
	/** Parsed manifest.json contents. */
	manifest?: ObsidianManifest
	/** Obsidian plugin directory URL. */
	url?: string
}

const communityPluginsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

const pluginStatsSchema = z.record(z.string(), z.record(z.string(), z.number()))

const manifestSchema = z.object({
	author: z.string().optional(),
	authorUrl: z.string().optional(),
	description: z.string().optional(),
	fundingUrl: z.string().optional(),
	id: z.string(),
	isDesktopOnly: z.boolean().optional(),
	minAppVersion: z.string().optional(),
	name: z.string().optional(),
	version: z.string().optional(),
})

async function readManifest(path: string): Promise<ObsidianManifest | undefined> {
	try {
		const content = await readFile(resolve(path, 'manifest.json'), 'utf8')
		return manifestSchema.parse(JSON.parse(content))
	} catch {
		return undefined
	}
}

async function isObsidianPlugin(path: string): Promise<boolean> {
	try {
		const content = await readFile(resolve(path, 'manifest.json'), 'utf8')
		const json = parseJsonRecord(content)
		return json !== undefined && 'id' in json && 'minAppVersion' in json
	} catch {
		return false
	}
}

export const obsidianSource: MetadataSource<'obsidian'> = {
	async extract(context: SourceContext): Promise<ObsidianData> {
		log.debug('Extracting Obsidian metadata...')

		const manifest = await readManifest(context.path)
		const url =
			manifest === undefined
				? undefined
				: `https://obsidian.md/plugins?id=${encodeURIComponent(manifest.id)}`

		if (!manifest) return {}

		try {
			const response = await fetch(communityPluginsUrl)
			if (!response.ok) return { manifest, url }

			const stats = pluginStatsSchema.parse(await response.json())
			if (!(manifest.id in stats)) return { manifest, url }
			const pluginStats = stats[manifest.id]
			const downloadCount = pluginStats.downloads || undefined

			return {
				downloadCount,
				manifest,
				url,
			}
		} catch {
			return { manifest, url }
		}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		return isObsidianPlugin(context.path)
	},
	key: 'obsidian',
}
