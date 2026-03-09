import type { GitConfig } from 'pkg-types'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { readGitConfig } from 'pkg-types'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

export type GitConfigInfo = {
	/** Parsed .git/config contents. */
	config?: GitConfig
}

export type GitConfigData = SourceRecord<GitConfigInfo> | undefined

export const gitConfigSource: MetadataSource<'gitConfig'> = {
	async extract(context: SourceContext): Promise<GitConfigData> {
		log.debug('Extracting git config metadata...')
		const config = await readGitConfig(context.path)
		return {
			data: { config },
			source: join(context.path, '.git', 'config'),
		}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(join(context.path, '.git', 'config'))
			return true
		} catch {
			return false
		}
	},
	key: 'gitConfig',
}
