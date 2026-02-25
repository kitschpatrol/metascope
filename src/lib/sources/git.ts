import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type GitData = {
	branchCount?: number
	branchCurrent?: string
	commitCount?: number
	commitDateFirst?: string
	commitDateLast?: string
	contributorCount?: number
	isClean?: boolean
	isDirty?: boolean
	tagCount?: number
	tagDateLatest?: string
	tagNameLatest?: string
	trackedFileCount?: number
}

export const gitSource: MetadataSource<'git'> = {
	async fetch(context: SourceContext): Promise<GitData> {
		log.debug('Fetching git metadata...')
		const git = simpleGit(context.path)

		const [statusResult, logResult, branchResult, tagResult, commitDateFirst, fileCountResult] =
			await Promise.all([
				git.status(),
				git.log(),
				git.branch(),
				git.tags(),
				git.raw(['rev-list', '--max-parents=0', 'HEAD', '--format=%aI']).then((output) => {
					// Output is "commit <hash>\n<date>" pairs; take the last date line
					const lines = output
						.trim()
						.split('\n')
						.filter((line) => !line.startsWith('commit '))
					return lines.at(-1) ?? undefined
				}),
				git.raw(['ls-files']).then((output) => output.trim().split('\n').filter(Boolean).length),
			])

		const contributors = new Set(logResult.all.map((commit) => commit.author_email))

		let tagDateLatest: string | undefined
		const tagNameLatest = tagResult.latest ?? undefined
		if (tagNameLatest) {
			try {
				const tagDate = await git.raw(['log', '-1', '--format=%aI', tagNameLatest])
				tagDateLatest = tagDate.trim() || undefined
			} catch {
				// Tag might not have associated commit info
			}
		}

		return {
			branchCount: branchResult.all.length,
			branchCurrent: branchResult.current,
			commitCount: logResult.total,
			commitDateFirst,
			commitDateLast: logResult.latest?.date ?? undefined,
			contributorCount: contributors.size,
			isClean: statusResult.isClean(),
			isDirty: !statusResult.isClean(),
			tagCount: tagResult.all.length,
			tagDateLatest,
			tagNameLatest,
			trackedFileCount: fileCountResult,
		}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(join(context.path, '.git'))
			return true
		} catch {
			return false
		}
	},
	key: 'git',
}
