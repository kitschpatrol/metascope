import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { InfoPlist } from '../parsers/info-plist-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseInfoPlist } from '../parsers/info-plist-parser'

export type InfoPlistData = Partial<InfoPlist>

export const infoPlistSource: MetadataSource<'infoPlist'> = {
	async extract(context: SourceContext): Promise<InfoPlistData> {
		log.debug('Extracting Info.plist metadata...')

		const content = await readFile(resolve(context.path, 'Info.plist'), 'utf8')
		return parseInfoPlist(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'Info.plist'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'infoPlist',
}
