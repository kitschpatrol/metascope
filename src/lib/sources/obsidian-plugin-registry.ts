import { z } from 'zod'
import type { SourceRecord } from './source'
import { log } from '../log'
import { ensureArray } from '../utilities/formatting'
import { obsidianPluginManifestJsonSource } from './obsidian-plugin-manifest-json'
import { defineSource } from './source'

export type ObsidianPluginRegistryInfo = {
	/** Total community download count. */
	downloadCount?: number
	/** Obsidian plugin directory URL. */
	url?: string
}

export type ObsidianPluginRegistryData = SourceRecord<ObsidianPluginRegistryInfo> | undefined

const communityPluginsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

const pluginStatsSchema = z.record(z.string(), z.record(z.string(), z.number()))

export const obsidianPluginRegistrySource = defineSource<'obsidianPluginRegistry'>({
	async getInputs(context) {
		if (context.options.offline) {
			log.warn("Skipping Obsidian plugin registry data source since we're in offline mode")
			return []
		}

		// Try to get plugin IDs from context
		let pluginIds = ensureArray(context.metadata?.obsidianPluginManifestJson)
			.map((value) => value?.data.id)
			.filter((value) => value !== undefined)

		// Fallback to running the manifest source directly
		if (pluginIds.length === 0) {
			const extraction = await obsidianPluginManifestJsonSource.extract(context)
			pluginIds = ensureArray(extraction)
				.map((value) => value?.data.id)
				.filter((value) => value !== undefined)
		}

		return pluginIds
	},
	key: 'obsidianPluginRegistry',
	async parseInput(input) {
		log.debug('Extracting Obsidian plugin registry metadata...')
		const pluginId = input
		const url = `https://obsidian.md/plugins?id=${encodeURIComponent(pluginId)}`

		const response = await fetch(communityPluginsUrl)
		if (!response.ok) {
			return { data: { url }, source: url }
		}

		const stats = pluginStatsSchema.parse(await response.json())
		const downloadCount = stats[pluginId].downloads || undefined

		return { data: { downloadCount, url }, source: url }
	},
	phase: 2,
})
