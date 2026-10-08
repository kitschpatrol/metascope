import { z } from 'zod'
import type { OneOrMany, SourceContext, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'
import { discardResponseBody, fetchWithRetry } from '../utilities/fetch'
import { ensureArray } from '../utilities/template-helpers'
import { obsidianPluginManifestJsonSource } from './obsidian-plugin-manifest-json'

export type ObsidianPluginRegistryInfo = {
	/** Total community download count. */
	downloadCount?: number
	/** Obsidian plugin directory URL. */
	url?: string
}

export type ObsidianPluginRegistryData =
	OneOrMany<SourceRecord<ObsidianPluginRegistryInfo>> | undefined

const communityPluginsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

const pluginStatsSchema = z.record(z.string(), z.record(z.string(), z.number()))

type PluginStats = z.infer<typeof pluginStatsSchema>

// The stats file covers every community plugin, so one download serves every
// plugin found in the same extraction. Keyed by the source context, which
// `defineSource` shares across all inputs of a single extraction.
const pluginStatsByContext = new WeakMap<SourceContext, Promise<PluginStats | undefined>>()

async function fetchPluginStats(): Promise<PluginStats | undefined> {
	const response = await fetchWithRetry(communityPluginsUrl)
	if (!response.ok) {
		discardResponseBody(response)
		return undefined
	}

	return pluginStatsSchema.parse(await response.json())
}

async function getPluginStats(context: SourceContext): Promise<PluginStats | undefined> {
	let pending = pluginStatsByContext.get(context)
	if (pending === undefined) {
		pending = fetchPluginStats()
		pluginStatsByContext.set(context, pending)
	}

	return pending
}

export const obsidianPluginRegistrySource = defineSource<'obsidianPluginRegistry'>({
	async discover(context) {
		if (context.options.offline) {
			log.debug("Skipping Obsidian plugin registry data source since we're in offline mode")
			return []
		}

		// Try to get plugin IDs from context
		let pluginIds = ensureArray(context.metadata?.obsidianPluginManifestJson).map(
			(value) => value.data.id,
		)

		// Fall back to extracting it ourselves if the source hasn't run yet
		if (pluginIds.length === 0 && !context.completedSources?.has('obsidianPluginManifestJson')) {
			log.debug(
				`Missing obsidianPluginManifestJson in source context metadata for ${context.options.path}, extracting it now...`,
			)
			const extraction = await obsidianPluginManifestJsonSource.extract(context)
			pluginIds = ensureArray(extraction).map((value) => value.data.id)
		}

		return pluginIds
	},
	key: 'obsidianPluginRegistry',
	async parse(input, context) {
		log.debug('Extracting Obsidian plugin registry metadata...')
		const pluginId = input
		const url = `https://obsidian.md/plugins?id=${encodeURIComponent(pluginId)}`

		const stats = await getPluginStats(context)
		if (stats === undefined) {
			return { data: { url }, source: url }
		}

		const downloads = stats[pluginId]?.downloads
		const downloadCount = downloads === undefined || downloads === 0 ? undefined : downloads

		return { data: { downloadCount, url }, source: url }
	},
	phase: 2,
})
