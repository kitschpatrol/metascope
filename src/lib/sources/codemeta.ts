import type { CodeMeta } from '@kitschpatrol/codemeta'
import { load } from '@kitschpatrol/codemeta'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type CodemetaData = CodeMeta

export const codemetaSource: MetadataSource<'codemeta'> = {
	async fetch(context: SourceContext) {
		log.debug('Fetching codemeta...')
		return load(context.path)
	},
	// eslint-disable-next-line ts/require-await
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'codemeta',
}
