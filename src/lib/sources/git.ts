import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type GitData = {
	branchCount?: number
	commitCount?: number
	contributorCount?: number
	currentBranch?: string
	firstCommitDate?: string
	isClean?: boolean
	isDirty?: boolean
	lastCommitDate?: string
	lastTagDate?: string
	lastTagName?: string
	tagCount?: number
	trackedFileCount?: number
}

export const gitSource: MetadataSource<'git'> = {
	async fetch(context: SourceContext): Promise<GitData> {
		log.debug('Fetching git metadata...')
		const git = simpleGit(context.path)

		const [statusResult, logResult, branchResult, tagResult, firstCommitDate, fileCountResult] =
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

		let lastTagDate: string | undefined
		const lastTagName = tagResult.latest ?? undefined
		if (lastTagName) {
			try {
				const tagDate = await git.raw(['log', '-1', '--format=%aI', lastTagName])
				lastTagDate = tagDate.trim() || undefined
			} catch {
				// Tag might not have associated commit info
			}
		}

		return {
			branchCount: branchResult.all.length,
			commitCount: logResult.total,
			contributorCount: contributors.size,
			currentBranch: branchResult.current,
			firstCommitDate,
			isClean: statusResult.isClean(),
			isDirty: !statusResult.isClean(),
			lastCommitDate: logResult.latest?.date ?? undefined,
			lastTagDate,
			lastTagName,
			tagCount: tagResult.all.length,
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
