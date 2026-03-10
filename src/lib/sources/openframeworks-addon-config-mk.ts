import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { parseMakefileConfig } from '../parsers/makefile-config-parser'
import { defineSource } from '../source'
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

export const openframeworksAddonConfigMkSource = defineSource<'openframeworksAddonConfigMk'>({
	async getInputs(context) {
		return getMatches(context.options, ['addon_config.mk'])
	},
	key: 'openframeworksAddonConfigMk',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: parse(content), source: input }
	},
	phase: 1,
})
