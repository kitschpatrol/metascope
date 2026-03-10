import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'
import { ensureArray } from '../utilities/template-helpers'
import { obsidianPluginManifestJsonSource } from './obsidian-plugin-manifest-json'

export type ObsidianPluginRegistryInfo = {
	/** Total community download count. */
	downloadCount?: number
	/** Obsidian plugin directory URL. */
	url?: string
}

export type ObsidianPluginRegistryData =
	| OneOrMany<SourceRecord<ObsidianPluginRegistryInfo>>
	| undefined

const communityPluginsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

const pluginStatsSchema = z.record(z.string(), z.record(z.string(), z.number()))

export const obsidianPluginRegistrySource = defineSource<'obsidianPluginRegistry'>({
	async discover(context) {
		if (context.options.offline) {
			log.warn("Skipping Obsidian plugin registry data source since we're in offline mode")
			return []
		}

		// Try to get plugin IDs from context
		let pluginIds = ensureArray(context.metadata?.obsidianPluginManifestJson).map(
			(value) => value.data.id,
		)

		// Fall back to extracting it ourselves if the source hasn't run yet
		if (pluginIds.length === 0 && !context.completedSources?.has('obsidianPluginManifestJson')) {
			log.warn(
				`Missing obsidianPluginManifestJson in source context metadata for ${context.options.path}, extracting it now...`,
			)
			const extraction = await obsidianPluginManifestJsonSource.extract(context)
			pluginIds = ensureArray(extraction).map((value) => value.data.id)
		}

		return pluginIds
	},
	key: 'obsidianPluginRegistry',
	async parse(input) {
		log.debug('Extracting Obsidian plugin registry metadata...')
		const pluginId = input
		const url = `https://obsidian.md/plugins?id=${encodeURIComponent(pluginId)}`

		const response = await fetch(communityPluginsUrl)
		if (!response.ok) {
			return { data: { url }, source: url }
		}

		const stats = pluginStatsSchema.parse(await response.json())
		// eslint-disable-next-line ts/no-unnecessary-condition -- pluginId may not exist in stats
		const downloadCount = stats[pluginId]?.downloads || undefined

		return { data: { downloadCount, url }, source: url }
	},
	phase: 2,
})
