import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type ObsidianData = {
	downloadCount?: number
	pluginId?: string
}

const communityPluginsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

const pluginStatsSchema = z.record(z.string(), z.record(z.string(), z.number()))

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

		try {
			const response = await fetch(communityPluginsUrl)
			if (!response.ok) return { pluginId }

			const stats = pluginStatsSchema.parse(await response.json())
			if (!(pluginId in stats)) return { pluginId }
			const pluginStats = stats[pluginId]

			// Sum downloads across all versions
			const downloadCount = Object.values(pluginStats).reduce((sum, count) => sum + count, 0)

			return {
				downloadCount,
				pluginId,
			}
		} catch {
			return { pluginId }
		}
	},
	// eslint-disable-next-line ts/require-await
	async isAvailable(context: SourceContext): Promise<boolean> {
		return getPluginId(context) !== undefined
	},
	key: 'obsidian',
}
