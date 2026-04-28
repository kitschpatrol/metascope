/* eslint-disable unicorn/no-useless-undefined */
import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { simpleGit } from 'simple-git'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'
import { batchMap } from '../utilities/formatting'

const VERSION_TAG_REGEX = /^v?\d+(?:\.\d+){1,2}$/
const LEADING_V_REGEX = /^v/

export type GitStatsInfo = {
	/** Total number of local branches. */
	branchCount?: number
	/** Name of the currently checked-out branch. */
	branchCurrent?: string
	/** Total number of commits in the current branch. */
	commitCount?: number
	/** ISO 8601 date of the repository's first commit. */
	commitDateFirst?: string
	/** ISO 8601 date of the most recent commit. */
	commitDateLast?: string
	/** Number of unique commit author emails. */
	contributorCount?: number
	/** Whether the repo uses Git LFS. */
	hasLfs?: boolean
	/** Whether the working tree has no uncommitted changes. */
	isClean?: boolean
	/** Whether the working tree has uncommitted changes. */
	isDirty?: boolean
	/** Whether any remote is ahead of the local branch. */
	isRemoteAhead?: boolean
	/** Number of configured remotes. */
	remoteCount?: number
	/** Per-remote ahead/behind commit counts relative to HEAD. */
	remoteStatus?: Record<string, { ahead: number; behind: number }>
	/** Number of registered git submodules. */
	submoduleCount?: number
	/** Total number of tags. */
	tagCount?: number
	/** ISO 8601 date of the most recent tag. */
	tagDateLatest?: string
	/** Name of the most recent tag. */
	tagNameLatest?: string
	/** Number of tags matching a version pattern (e.g. v1.2.3). */
	tagReleaseCount?: number
	/** ISO 8601 date of the most recent version tag. */
	tagVersionDateLatest?: string
	/** Most recent version tag, without the leading "v". */
	tagVersionLatest?: string
	/** Total commits ahead of all remotes combined. */
	totalAhead?: number
	/** Total commits behind all remotes combined. */
	totalBehind?: number
	/** Number of files tracked by git. */
	trackedFileCount?: number
	/** Total size in bytes of all tracked files. */
	trackedSizeBytes?: number
	/** Number of files with staged or unstaged changes. */
	uncommittedFileCount?: number
}

export type GitStatsData = OneOrMany<SourceRecord<GitStatsInfo>> | undefined

export const gitStatsSource = defineSource<'gitStats'>({
	async discover(context) {
		// Have to match actual file, not just folder
		const temporary = await getMatches(context.options, ['.git/config'])

		// Then pop up to the directory containing the `.git` folder
		return temporary.map((value) => resolve(value, '../../'))
	},
	key: 'gitStats',
	async parse(input, context) {
		log.debug('Extracting git statistics metadata...')

		const git = simpleGit(input)

		const [
			statusResult,
			logResult,
			branchResult,
			tagResult,
			commitDateFirst,
			trackedFiles,
			remotes,
			submoduleCount,
			hasLfs,
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
			git.getRemotes(),
			git
				.raw(['submodule', 'status'])
				.then((output) => {
					const count = output.trim().split('\n').filter(Boolean).length
					return count > 0 ? count : undefined
				})
				.catch(() => undefined),
			git
				.raw(['lfs', 'ls-files'])
				.then((output) => (output.trim().length > 0 ? true : undefined))
				.catch(() => undefined),
		])

		const contributors = new Set(logResult.all.map((commit) => commit.author_email))
		const tagNameLatest = tagResult.latest ?? undefined

		// These four operations are independent — run them concurrently
		const [trackedSizeBytes, tagDateLatest, versionTagInfo, remoteStatusEntries] =
			await Promise.all([
				// 1. Sum tracked file sizes
				batchMap(trackedFiles, async (file) => {
					try {
						const fileStat = await stat(join(context.options.path, file))
						return fileStat.size
					} catch {
						return 0
					}
				}).then((sizes) => sizes.reduce((sum, size) => sum + size, 0)),
				// 2. Latest tag date
				(async (): Promise<string | undefined> => {
					if (!tagNameLatest) {
						return undefined
					}

					try {
						const tagDate = await git.raw(['log', '-1', '--format=%aI', tagNameLatest])
						return tagDate.trim() || undefined
					} catch {
						return undefined
					}
				})(),
				// 3. Version tag discovery
				(async () => {
					try {
						const tagsByDate = await git.raw(['tag', '--sort=-creatordate'])
						const allTags = tagsByDate.trim().split('\n').filter(Boolean)
						const versionTags = allTags.filter((tag) => VERSION_TAG_REGEX.test(tag))
						const tagReleaseCount = versionTags.length > 0 ? versionTags.length : undefined
						const match = versionTags[0]
						if (match) {
							const tagDate = await git.raw(['log', '-1', '--format=%aI', match])
							return {
								tagReleaseCount,
								tagVersionDateLatest: tagDate.trim() || undefined,
								tagVersionLatest: match.replace(LEADING_V_REGEX, ''),
							}
						}

						return { tagReleaseCount, tagVersionDateLatest: undefined, tagVersionLatest: undefined }
					} catch {
						return {
							tagReleaseCount: undefined,
							tagVersionDateLatest: undefined,
							tagVersionLatest: undefined,
						}
					}
				})(),
				// 4. Remote status comparison
				Promise.all(
					remotes.map(async (remote) => {
						for (const branch of ['main', 'master']) {
							const reference = `${remote.name}/${branch}`
							try {
								const output = await git.raw([
									'rev-list',
									'--left-right',
									'--count',
									`HEAD...${reference}`,
								])
								const [ahead, behind] = output.trim().split('\t').map(Number)
								return [remote.name, { ahead, behind }] as const
							} catch {
								// Branch doesn't exist on this remote
							}
						}
					}),
				),
			])

		const { tagReleaseCount, tagVersionDateLatest, tagVersionLatest } = versionTagInfo

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
			data: {
				branchCount: branchResult.all.length,
				branchCurrent: branchResult.current,
				commitCount: logResult.total,
				commitDateFirst,
				commitDateLast: logResult.latest?.date ?? undefined,
				contributorCount: contributors.size,
				hasLfs,
				isClean: statusResult.isClean(),
				isDirty: !statusResult.isClean(),
				isRemoteAhead: Object.values(remoteStatus).some((s) => s.behind > 0) || undefined,
				remoteCount: remotes.length,
				remoteStatus: Object.keys(remoteStatus).length > 0 ? remoteStatus : undefined,
				submoduleCount,
				tagCount: tagResult.all.length,
				tagDateLatest,
				tagNameLatest,
				tagReleaseCount,
				tagVersionDateLatest,
				tagVersionLatest,
				totalAhead,
				totalBehind,
				trackedFileCount: trackedFiles.length,
				trackedSizeBytes,
				uncommittedFileCount: statusResult.files.length,
			},
			source: input,
		}
	},
	phase: 1,
})
