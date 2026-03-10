import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'

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

export type ObsidianPluginManifestJsonData = OneOrMany<SourceRecord<ObsidianManifest>> | undefined

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

export const obsidianPluginManifestJsonSource = defineSource<'obsidianPluginManifestJson'>({
	async discover(context) {
		return getMatches(context.options, ['manifest.json'])
	},
	key: 'obsidianPluginManifestJson',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const parsed = manifestSchema.safeParse(JSON.parse(content))
		if (parsed.success) {
			return { data: parsed.data, source: input }
		}
	},
	phase: 1,
})
