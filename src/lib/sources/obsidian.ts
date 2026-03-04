import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type ObsidianManifest = {
	author?: string
	authorUrl?: string
	description?: string
	fundingUrl?: string
	id: string
	isDesktopOnly?: boolean
	minAppVersion?: string
	name?: string
	version?: string
}

export type ObsidianData = {
	downloadCount?: number
	manifest?: ObsidianManifest
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

function getPluginId(context: SourceContext): string | undefined {
	const keywords = context.codemeta?.keywords
	if (!keywords) return undefined

	const keywordList: string[] = Array.isArray(keywords)
		? keywords.filter((k): k is string => typeof k === 'string')
		: typeof keywords === 'string'
			? [keywords]
			: []

	const isObsidianPlugin = keywordList.some(
		(keyword) =>
			keyword.toLowerCase().includes('obsidian-plugin') ||
			keyword.toLowerCase().includes('obsidian plugin'),
	)

	if (!isObsidianPlugin) return undefined

	const name = context.codemeta?.name
	if (!name) return undefined
	if (Array.isArray(name)) {
		// eslint-disable-next-line ts/no-unsafe-assignment
		const first = name[0]
		return typeof first === 'string' ? first : undefined
	}

	return typeof name === 'string' ? name : undefined
}

export const obsidianSource: MetadataSource<'obsidian'> = {
	async extract(context: SourceContext): Promise<ObsidianData> {
		log.debug('Extracting Obsidian metadata...')
		const pluginId = getPluginId(context)
		if (!pluginId) return {}

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
	// eslint-disable-next-line ts/require-await
	async isAvailable(context: SourceContext): Promise<boolean> {
		return getPluginId(context) !== undefined
	},
	key: 'obsidian',
}
