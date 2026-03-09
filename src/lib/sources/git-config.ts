import type { GitConfig } from 'pkg-types'
import { readGitConfig } from 'pkg-types'
import type { SourceRecord } from './source'
import { log } from '../log'
import { defineSource, getMatches } from './source'

export type GitConfigInfo = {
	/** Parsed .git/config contents. */
	config?: GitConfig
}

export type GitConfigData = SourceRecord<GitConfigInfo> | undefined

export const gitConfigSource = defineSource<'gitConfig'>({
	async getInputs(context) {
		return getMatches(context.options, ['.git/config'])
	},
	key: 'gitConfig',
	async parseInput(input, context) {
		console.log('----------------------------------')
		console.log(input)
		log.debug('Extracting git config metadata...')
		const config = await readGitConfig(input)
		return {
			data: { config },
			source: input,
		}
	},
	phase: 1,
})
