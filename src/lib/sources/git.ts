import type { GitConfig } from 'pkg-types'
import { access, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { readGitConfig } from 'pkg-types'
import { simpleGit } from 'simple-git'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type { GitConfig } from 'pkg-types'

export type GitData = {
	branchCount?: number
	branchCurrent?: string
	commitCount?: number
	commitDateFirst?: string
	commitDateLast?: string
	config?: GitConfig
	contributorCount?: number
	isClean?: boolean
	isDirty?: boolean
	isRemoteAhead?: boolean
	remoteCount?: number
	remoteStatus?: Record<string, { ahead: number; behind: number }>
	tagCount?: number
	tagDateLatest?: string
	tagNameLatest?: string
	totalAhead?: number
	totalBehind?: number
	trackedFileCount?: number
	trackedSizeBytes?: number
}

export const gitSource: MetadataSource<'git'> = {
	async extract(context: SourceContext): Promise<GitData> {
		log.debug('Extracting git metadata...')
		const git = simpleGit(context.path)

		const [
			statusResult,
			logResult,
			branchResult,
			tagResult,
			commitDateFirst,
			trackedFiles,
			config,
			remotes,
		] = await Promise.all([
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
			git.raw(['ls-files']).then((output) => output.trim().split('\n').filter(Boolean)),
			readGitConfig(context.path),
			git.getRemotes(),
		])

		const trackedSizeBytes = (
			await Promise.all(
				trackedFiles.map(async (file) => {
					try {
						const fileStat = await stat(join(context.path, file))
						return fileStat.size
					} catch {
						return 0
					}
				}),
			)
		).reduce((sum, size) => sum + size, 0)

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

		// Compare HEAD against each remote's main/master branch
		const remoteStatusEntries = await Promise.all(
			remotes.map(async (remote) => {
				for (const branch of ['main', 'master']) {
					const ref = `${remote.name}/${branch}`
					try {
						const output = await git.raw(['rev-list', '--left-right', '--count', `HEAD...${ref}`])
						const [ahead, behind] = output.trim().split('\t').map(Number)
						return [remote.name, { ahead, behind }] as const
					} catch {
						// Branch doesn't exist on this remote
					}
				}
			}),
		)

		const remoteStatus: Record<string, { ahead: number; behind: number }> = {}
		for (const entry of remoteStatusEntries) {
			if (entry) {
				remoteStatus[entry[0]] = entry[1]
			}
		}

		const remoteStatusValues = Object.values(remoteStatus)
		const totalAhead =
			remoteStatusValues.length > 0
				? remoteStatusValues.reduce((sum, s) => sum + s.ahead, 0)
				: undefined
		const totalBehind =
			remoteStatusValues.length > 0
				? remoteStatusValues.reduce((sum, s) => sum + s.behind, 0)
				: undefined

		return {
			branchCount: branchResult.all.length,
			branchCurrent: branchResult.current,
			commitCount: logResult.total,
			commitDateFirst,
			commitDateLast: logResult.latest?.date ?? undefined,
			config,
			contributorCount: contributors.size,
			isClean: statusResult.isClean(),
			isDirty: !statusResult.isClean(),
			isRemoteAhead: Object.values(remoteStatus).some((s) => s.behind > 0) || undefined,
			remoteCount: remotes.length,
			remoteStatus: Object.keys(remoteStatus).length > 0 ? remoteStatus : undefined,
			tagCount: tagResult.all.length,
			tagDateLatest,
			tagNameLatest,
			totalAhead,
			totalBehind,
			trackedFileCount: trackedFiles.length,
			trackedSizeBytes,
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
