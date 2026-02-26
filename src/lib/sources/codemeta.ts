import type { CodeMeta } from '@kitschpatrol/codemeta'
import { generate } from '@kitschpatrol/codemeta'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type CodemetaData = CodeMeta

export const codemetaSource: MetadataSource<'codemeta'> = {
	async extract(context: SourceContext) {
		log.debug('Extracting codemeta...')
		return generate(context.path, {
			enrich: true,
			recursive: false,
		})
	},
	// eslint-disable-next-line ts/require-await
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'codemeta',
}
