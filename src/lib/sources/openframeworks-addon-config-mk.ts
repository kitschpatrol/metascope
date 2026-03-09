import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseMakefileConfig } from '../parsers/makefile-config-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'
import { matchFiles } from './source'

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

export type OpenframeworksAddonConfigMkData =
	| OneOrMany<SourceRecord<OpenframeworksAddonConfig>>
	| undefined

/**
 * Parse an `addon_config.mk` file and return validated metadata.
 */
export function parse(content: string): OpenframeworksAddonConfig {
	const raw = parseMakefileConfig(content)
	return openframeworksAddonConfigSchema.parse(raw)
}

export const openframeworksAddonConfigMkSource: MetadataSource<'openframeworksAddonConfigMk'> = {
	async extract(context: SourceContext): Promise<OpenframeworksAddonConfigMkData> {
		const files = matchFiles(context.fileTree, ['**/addon_config.mk'])
		if (files.length === 0) return undefined

		log.debug('Extracting openFrameworks addon config metadata...')
		const results: Array<SourceRecord<OpenframeworksAddonConfig>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				results.push({ data: parse(content), source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'openframeworksAddonConfigMk',
	phase: 1,
}
