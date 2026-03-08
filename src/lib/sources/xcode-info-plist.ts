import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { InfoPlist } from '../parsers/xcode-info-plist-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseInfoPlist } from '../parsers/xcode-info-plist-parser'

export type XcodeInfoPlistData = Partial<InfoPlist>

export const xcodeInfoPlistSource: MetadataSource<'xcodeInfoPlist'> = {
	async extract(context: SourceContext): Promise<XcodeInfoPlistData> {
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
	key: 'xcodeInfoPlist',
}
