import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from './source'
import { parseJsonRecord } from '../utilities/schema-primitives'
import { defineSource, getMatches } from './source'

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

export type ObsidianManifestJsonExtra = {
	/** Total community download count. */
	downloadCount?: number
	/** Obsidian plugin directory URL. */
	url?: string
}

export type ObsidianManifestJsonData =
	| OneOrMany<SourceRecord<ObsidianManifest, ObsidianManifestJsonExtra>>
	| undefined

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

function isObsidianManifest(content: string): boolean {
	const json = parseJsonRecord(content)
	return json !== undefined && 'id' in json && 'minAppVersion' in json
}

export const obsidianManifestJsonSource = defineSource<'obsidianManifestJson'>({
	async getInputs(context) {
		return getMatches(context.options, ['manifest.json'])
	},
	key: 'obsidianManifestJson',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		if (!isObsidianManifest(content)) return

		const manifest = manifestSchema.parse(JSON.parse(content))
		const url = `https://obsidian.md/plugins?id=${encodeURIComponent(manifest.id)}`

		try {
			const response = await fetch(communityPluginsUrl)
			if (!response.ok) {
				return { data: manifest, extra: { url }, source: input }
			}

			const stats = pluginStatsSchema.parse(await response.json())
			if (!(manifest.id in stats)) {
				return { data: manifest, extra: { url }, source: input }
			}

			const pluginStats = stats[manifest.id]
			const downloadCount = pluginStats.downloads || undefined
			return { data: manifest, extra: { downloadCount, url }, source: input }
		} catch {
			return { data: manifest, extra: { url }, source: input }
		}
	},
	phase: 1,
})
