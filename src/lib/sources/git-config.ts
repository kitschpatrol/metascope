import type { GitConfig } from 'pkg-types'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { readGitConfig } from 'pkg-types'
import type { SourceRecord } from './source'
import { log } from '../log'
import { defineSource } from './source'

export type GitConfigInfo = {
	/** Parsed .git/config contents. */
	config?: GitConfig
}

export type GitConfigData = SourceRecord<GitConfigInfo> | undefined

export const gitConfigSource = defineSource<'gitConfig'>({
	async getInputs(context) {
		try {
			await access(join(context.options.path, '.git', 'config'))
			return [join(context.options.path, '.git', 'config')]
		} catch {
			return []
		}
	},
	key: 'gitConfig',
	async parseInput(input, context) {
		log.debug('Extracting git config metadata...')
		const config = await readGitConfig(context.options.path)
		return {
			data: { config },
			source: input,
		}
	},
	phase: 1,
})
