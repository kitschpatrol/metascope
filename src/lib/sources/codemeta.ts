import type { CodeMetaBasic } from '@kitschpatrol/codemeta'
import { generate, setLogger } from '@kitschpatrol/codemeta'
import { getChildLogger } from 'lognow'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

setLogger(getChildLogger(log, 'codemeta'))

export type CodeMetaData = CodeMetaBasic

export const codemetaSource: MetadataSource<'codemeta'> = {
	async extract(context: SourceContext) {
		log.debug('Extracting codemeta...')
		return generate(context.path, {
			basic: true,
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
