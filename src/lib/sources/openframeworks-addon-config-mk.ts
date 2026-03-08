import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OpenframeworksAddonConfig } from '../parsers/openframeworks-addon-config-mk-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseOpenframeworksAddonConfig } from '../parsers/openframeworks-addon-config-mk-parser'

export type OpenframeworksAddonConfigMkData = Partial<OpenframeworksAddonConfig>

export const openframeworksAddonConfigMkSource: MetadataSource<'openframeworksAddonConfigMk'> = {
	async extract(context: SourceContext): Promise<OpenframeworksAddonConfigMkData> {
		log.debug('Extracting openFrameworks addon config metadata...')

		const content = await readFile(resolve(context.path, 'addon_config.mk'), 'utf8')
		return parseOpenframeworksAddonConfig(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'addon_config.mk'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'openframeworksAddonConfigMk',
}
