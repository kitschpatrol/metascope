import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseOpenFrameworksAddonConfig } from '../parsers/open-frameworks-addon-config-parser'

export type OpenFrameworksAddonConfigData = {
	/** `ADDON_AUTHOR` from `meta:` section. */
	author?: string
	/** `ADDON_DEPENDENCIES` from `common:` section (space-separated addon names). */
	dependencies?: string[]
	/** `ADDON_DESCRIPTION` from `meta:` section. */
	description?: string
	/** `ADDON_NAME` from `meta:` section. */
	name?: string
	/** Platform section names that contain at least one variable assignment. */
	platformSections?: string[]
	/** `ADDON_TAGS` from `meta:` section (quote-aware tokenized). */
	tags?: string[]
	/** `ADDON_URL` from `meta:` section. */
	url?: string
}

export const openFrameworksAddonConfigSource: MetadataSource<'openFrameworksAddonConfig'> = {
	async extract(context: SourceContext): Promise<OpenFrameworksAddonConfigData> {
		log.debug('Extracting openFrameworks addon config metadata...')

		const content = await readFile(resolve(context.path, 'addon_config.mk'), 'utf8')
		return parseOpenFrameworksAddonConfig(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'addon_config.mk'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'openFrameworksAddonConfig',
}
