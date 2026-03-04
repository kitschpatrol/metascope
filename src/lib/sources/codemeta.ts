import type { CodeMetaBasic } from '@kitschpatrol/codemeta'
import { generate, setLogger } from '@kitschpatrol/codemeta'
import { getChildLogger } from 'lognow'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

setLogger(
	getChildLogger(log, 'codemeta').withFreshPlugins([
		{
			// Only log from codemeta if parent is verbose
			shouldSendToLogger: ({ logLevel }, loglayer) => loglayer.isLevelEnabled(logLevel),
			transformLogLevel: ({ logLevel }) =>
				logLevel === 'error' || logLevel === 'warn' ? 'debug' : logLevel,
		},
	]),
)

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
