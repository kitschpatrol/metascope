import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CinderCinderblock } from '../parsers/cinder-cinderblock-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseCinderCinderblock } from '../parsers/cinder-cinderblock-parser'

export type CinderCinderblockData = Partial<CinderCinderblock>

export const cinderCinderblockSource: MetadataSource<'cinderCinderblock'> = {
	async extract(context: SourceContext): Promise<CinderCinderblockData> {
		log.debug('Extracting Cinder cinderblock.xml metadata...')

		const content = await readFile(resolve(context.path, 'cinderblock.xml'), 'utf8')
		return parseCinderCinderblock(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'cinderblock.xml'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'cinderCinderblock',
}
