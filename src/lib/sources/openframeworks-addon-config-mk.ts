import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseMakefileConfig } from '../parsers/makefile-config-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const openframeworksAddonConfigSchema = z.object({
	/** `ADDON_AUTHOR` from `meta:` section. */
	author: nonEmptyString,
	/** `ADDON_DEPENDENCIES` from `common:` section (space-separated addon names). */
	dependencies: stringArray,
	/** `ADDON_DESCRIPTION` from `meta:` section. */
	description: nonEmptyString,
	/** `ADDON_NAME` from `meta:` section. */
	name: nonEmptyString,
	/** Platform section names that contain at least one variable assignment. */
	platformSections: stringArray,
	/** `ADDON_TAGS` from `meta:` section (quote-aware tokenized). */
	tags: stringArray,
	/** `ADDON_URL` from `meta:` section. */
	url: optionalUrl,
})

export type OpenframeworksAddonConfig = z.infer<typeof openframeworksAddonConfigSchema>

export type OpenframeworksAddonConfigMkData = SourceRecord<OpenframeworksAddonConfig> | undefined

/**
 * Parse an `addon_config.mk` file and return validated metadata.
 */
export function parse(content: string): OpenframeworksAddonConfig {
	const raw = parseMakefileConfig(content)
	return openframeworksAddonConfigSchema.parse(raw)
}

export const openframeworksAddonConfigMkSource: MetadataSource<'openframeworksAddonConfigMk'> = {
	async extract(context: SourceContext): Promise<OpenframeworksAddonConfigMkData> {
		log.debug('Extracting openFrameworks addon config metadata...')

		const filePath = resolve(context.path, 'addon_config.mk')
		let content: string
		try {
			content = await readFile(filePath, 'utf8')
		} catch {
			return undefined
		}

		return { data: parse(content), source: filePath }
	},
	key: 'openframeworksAddonConfigMk',
	phase: 1,}
