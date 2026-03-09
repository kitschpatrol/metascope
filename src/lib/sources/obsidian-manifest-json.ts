import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseJsonRecord } from '../utilities/schema-primitives'
import { matchFiles } from './source'

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

export const obsidianManifestJsonSource: MetadataSource<'obsidianManifestJson'> = {
	async extract(context: SourceContext): Promise<ObsidianManifestJsonData> {
		const files = matchFiles(context.fileTree, ['**/manifest.json'])
		if (files.length === 0) return undefined

		log.debug('Extracting Obsidian metadata...')
		const results: Array<SourceRecord<ObsidianManifest, ObsidianManifestJsonExtra>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.path, file), 'utf8')
				if (!isObsidianManifest(content)) continue

				const manifest = manifestSchema.parse(JSON.parse(content))
				const url = `https://obsidian.md/plugins?id=${encodeURIComponent(manifest.id)}`

				try {
					const response = await fetch(communityPluginsUrl)
					if (!response.ok) {
						results.push({ data: manifest, extra: { url }, source: file })
						continue
					}

					const stats = pluginStatsSchema.parse(await response.json())
					if (!(manifest.id in stats)) {
						results.push({ data: manifest, extra: { url }, source: file })
						continue
					}

					const pluginStats = stats[manifest.id]
					const downloadCount = pluginStats.downloads || undefined
					results.push({ data: manifest, extra: { downloadCount, url }, source: file })
				} catch {
					results.push({ data: manifest, extra: { url }, source: file })
				}
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'obsidianManifestJson',
	phase: 1,
}
