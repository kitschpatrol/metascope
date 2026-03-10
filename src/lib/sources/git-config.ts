import type { GitConfig } from 'pkg-types'
import { readGitConfig } from 'pkg-types'
import type { SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'

type GitConfigInfo = GitConfig

export type GitConfigData = SourceRecord<GitConfigInfo> | undefined

export const gitConfigSource = defineSource<'gitConfig'>({
	async getInputs(context) {
		return getMatches(context.options, ['.git/config'])
	},
	key: 'gitConfig',
	async parseInput(input) {
		log.debug('Extracting git config metadata...')
		const config = await readGitConfig(input)
		return {
			data: { ...config },
			source: input,
		}
	},
	phase: 1,
})
