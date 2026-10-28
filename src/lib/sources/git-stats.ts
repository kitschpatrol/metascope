import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { exec, NonZeroExitError } from 'tinyexec'
import type { OneOrMany, SourceRecord } from '../source'
import { getGitRepositories } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'
import { batchMap } from '../utilities/formatting'

const VERSION_TAG_REGEX = /^v?\d+(?:\.\d+){1,2}$/v
const LEADING_V_REGEX = /^v/v
const SEGMENT_NUMBER_REGEX = /^\D*(\d+)/v
const AHEAD_BEHIND_REGEX = /^\+(\d+) -(\d+)$/v
const DETACHED_HEAD_REGEX = /^\((?:HEAD )?detached (?:at|from) (\S+)\)$/v
const GITLINK_MODE = '160000'

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
	/**
	 * Commits on the current branch that are not on its upstream. Undefined when
	 * there is no upstream or its ref is missing locally.
	 */
	upstreamAhead?: number
	/**
	 * Commits on the upstream that are not on the current branch. Undefined when
	 * there is no upstream or its ref is missing locally.
	 */
	upstreamBehind?: number
	/** Upstream branch the current branch tracks, e.g. "origin/main". */
	upstreamBranch?: string
}

export type GitStatsData = OneOrMany<SourceRecord<GitStatsInfo>> | undefined

type AheadBehind = { ahead: number; behind: number }

type StatusInfo = Pick<GitStatsInfo, 'upstreamAhead' | 'upstreamBehind' | 'upstreamBranch'> & {
	/** Branch name, or where a detached HEAD was checked out from. */
	branchCurrent: string | undefined
	changedFileCount: number
	isDetached: boolean
}

type Tag = {
	/** ISO 8601 author date of the commit the tag points to. */
	date: string | undefined
	name: string
}

type ReferencesInfo = {
	/**
	 * Local and remote-tracking branches, excluding symbolic refs like
	 * origin/HEAD.
	 */
	branchCount: number
	remoteRefs: Set<string>
	/** Newest first, by tagger date for annotated tags and commit date otherwise. */
	tags: Tag[]
}

type HistoryInfo = Pick<GitStatsInfo, 'commitDateFirst' | 'commitDateLast'> & {
	commitCount: number
	contributorCount: number
}

type TrackedInfo = Pick<GitStatsInfo, 'submoduleCount'> & {
	trackedFileCount: number
	trackedSizeBytes: number
}

/**
 * Run git in a repository and return its standard output.
 */
async function git(cwd: string, gitArguments: string[]): Promise<string> {
	try {
		const { stdout } = await exec('git', gitArguments, {
			nodeOptions: { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
			throwOnError: true,
		})
		return stdout
	} catch (error) {
		if (error instanceof NonZeroExitError) {
			const stderr = error.output?.stderr.trim() ?? ''
			throw new Error(
				`git ${gitArguments[0]} failed in "${cwd}"${stderr === '' ? ` with exit code ${error.exitCode}` : `: ${stderr}`}`,
				{ cause: error },
			)
		}

		throw error
	}
}

/**
 * Split command output into records, dropping the empty one after a trailing
 * separator.
 */
function splitRecords(output: string, separator: '\0' | '\n'): string[] {
	return output.split(separator).filter((record) => record !== '')
}

/**
 * Name the ref or commit a detached HEAD was checked out from, as `git branch`
 * describes it. Undefined in states like an interactive rebase, which `git
 * branch` describes without one.
 */
async function getDetachedHeadName(cwd: string): Promise<string | undefined> {
	const output = await git(cwd, ['branch', '--format=%(refname)'])
	for (const line of splitRecords(output, '\n')) {
		const match = DETACHED_HEAD_REGEX.exec(line)
		if (match) {
			return match[1]
		}
	}

	return undefined
}

/**
 * Read the current branch, its upstream, and the number of changed files.
 * Upstream counts are absent when the upstream ref is missing locally, e.g.
 * deleted on the remote and pruned, or when HEAD has no commits.
 */
async function getStatus(cwd: string): Promise<StatusInfo> {
	const output = await git(cwd, [
		'status',
		'--porcelain=v2',
		'--branch',
		'--untracked-files=all',
		'-z',
	])

	const headers = new Map<string, string>()
	let changedFileCount = 0
	const entries = output.split('\0')
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? ''
		if (entry.startsWith('# ')) {
			const separator = entry.indexOf(' ', 2)
			headers.set(entry.slice(2, separator), entry.slice(separator + 1))
		} else if (entry.startsWith('2 ')) {
			// Renamed and copied entries are followed by their original path
			changedFileCount++
			index++
		} else if (entry.startsWith('1 ') || entry.startsWith('u ') || entry.startsWith('? ')) {
			changedFileCount++
		}
	}

	const head = headers.get('branch.head')
	const isDetached = head === '(detached)'
	const aheadBehind = AHEAD_BEHIND_REGEX.exec(headers.get('branch.ab') ?? '')

	return {
		branchCurrent: isDetached ? await getDetachedHeadName(cwd) : head,
		changedFileCount,
		isDetached,
		upstreamAhead: aheadBehind ? Number(aheadBehind[1]) : undefined,
		upstreamBehind: aheadBehind ? Number(aheadBehind[2]) : undefined,
		upstreamBranch: headers.get('branch.upstream'),
	}
}

/**
 * List branches and tags in one pass, with the author date of the commit each
 * tag points to.
 */
async function getReferences(cwd: string): Promise<ReferencesInfo> {
	const output = await git(cwd, [
		'for-each-ref',
		'--sort=-creatordate',
		'--format=%(refname)%00%(symref)%00%(authordate:iso-strict)%(*authordate:iso-strict)',
		'refs/heads',
		'refs/remotes',
		'refs/tags',
	])

	let branchCount = 0
	const remoteReferences = new Set<string>()
	const tags: Tag[] = []
	for (const line of splitRecords(output, '\n')) {
		const [refname = '', symref = '', date = ''] = line.split('\0', 3)
		if (refname.startsWith('refs/tags/')) {
			tags.push({ date: date === '' ? undefined : date, name: refname.slice('refs/tags/'.length) })
			continue
		}

		if (symref === '') {
			branchCount++
		}

		if (refname.startsWith('refs/remotes/')) {
			remoteReferences.add(refname)
		}
	}

	return { branchCount, remoteRefs: remoteReferences, tags }
}

/**
 * Count commits and contributors reachable from HEAD, and find the first and
 * latest commit dates, from a single history walk.
 */
async function getHistory(cwd: string): Promise<HistoryInfo> {
	// `--ignore-missing` prints nothing for an unborn HEAD instead of failing
	const output = await git(cwd, [
		'log',
		'--ignore-missing',
		'--no-show-signature',
		'--format=%P%x00%aI%x00%aE',
		'HEAD',
		'--',
	])

	const commits = splitRecords(output, '\n').map((line) => {
		const [parents = '', date = '', email = ''] = line.split('\0', 3)
		return { date, email, parents }
	})

	return {
		commitCount: commits.length,
		// Root commits have no parents, and the log lists the earliest one last
		commitDateFirst: commits.findLast((commit) => commit.parents === '')?.date,
		commitDateLast: commits[0]?.date,
		contributorCount: new Set(commits.map((commit) => commit.email)).size,
	}
}

/**
 * Count submodules that are checked in as gitlinks and mapped in `.gitmodules`,
 * matching what `git submodule status` lists.
 */
async function countSubmodules(cwd: string, gitlinks: Set<string>): Promise<number | undefined> {
	if (gitlinks.size === 0) {
		return undefined
	}

	let output: string
	try {
		output = await git(cwd, [
			'config',
			'--file',
			'.gitmodules',
			'--null',
			'--get-regexp',
			String.raw`^submodule\..*\.path$`,
		])
	} catch {
		// No readable `.gitmodules`, or no paths in it
		return undefined
	}

	// Each entry is "<key>\n<value>"
	const count = splitRecords(output, '\0').filter((entry) =>
		gitlinks.has(entry.slice(entry.indexOf('\n') + 1)),
	).length
	return count > 0 ? count : undefined
}

/**
 * Count and measure the files in the index, and count registered submodules.
 * Sizes come from the working tree, so they include Git LFS content and
 * unstaged edits.
 */
async function getTrackedFiles(cwd: string): Promise<TrackedInfo> {
	// Each entry is "<mode> <object> <stage>\t<path>", and conflicted paths
	// appear once per stage, as in plain `git ls-files`
	const output = await git(cwd, ['ls-files', '--stage', '-z'])
	const files = splitRecords(output, '\0').map((entry) => ({
		mode: entry.slice(0, entry.indexOf(' ')),
		path: entry.slice(entry.indexOf('\t') + 1),
	}))

	const gitlinks = new Set(
		files.filter((file) => file.mode === GITLINK_MODE).map((file) => file.path),
	)

	const [sizes, submoduleCount] = await Promise.all([
		batchMap(files, async (file) => {
			try {
				const fileStat = await stat(join(cwd, file.path))
				return fileStat.size
			} catch {
				// Deleted from the working tree
				return 0
			}
		}),
		countSubmodules(cwd, gitlinks),
	])

	return {
		submoduleCount,
		trackedFileCount: files.length,
		trackedSizeBytes: sizes.reduce((sum, size) => sum + size, 0),
	}
}

/**
 * Whether gitattributes route any tracked file through Git LFS. Reads
 * attributes instead of running the git-lfs binary.
 */
async function hasLfsFiles(cwd: string): Promise<true | undefined> {
	const output = await git(cwd, ['ls-files', '-z', '--', ':(attr:filter=lfs)'])
	return output === '' ? undefined : true
}

/**
 * List configured remote names.
 */
async function getRemoteNames(cwd: string): Promise<string[]> {
	return splitRecords(await git(cwd, ['remote']), '\n')
}

/**
 * Count commits on HEAD and on `reference` that the other lacks.
 */
async function compareWithHead(cwd: string, reference: string): Promise<AheadBehind> {
	const output = await git(cwd, ['rev-list', '--left-right', '--count', `HEAD...${reference}`])
	const [ahead = 0, behind = 0] = output.trim().split('\t').map(Number)
	return { ahead, behind }
}

/**
 * Compare HEAD with each remote's main branch, or its master branch when there
 * is no main.
 */
async function getRemoteStatus(
	cwd: string,
	remotes: string[],
	remoteReferences: Set<string>,
): Promise<Record<string, AheadBehind>> {
	const entries = await Promise.all(
		remotes.map(async (remote) => {
			const reference = ['main', 'master']
				.map((branch) => `refs/remotes/${remote}/${branch}`)
				.find((reference_) => remoteReferences.has(reference_))
			return reference === undefined
				? undefined
				: ([remote, await compareWithHead(cwd, reference)] as const)
		}),
	)

	return Object.fromEntries(entries.filter((entry) => entry !== undefined))
}

/**
 * Leading number of a tag name segment, skipping a prefix like "v".
 */
function getSegmentNumber(segment = ''): number {
	const digits = SEGMENT_NUMBER_REGEX.exec(segment)?.[1]
	return digits === undefined ? 0 : Number(digits)
}

/**
 * Order tag names by their dot-separated numeric segments, then by name.
 */
function compareTagVersions(a: string, b: string): number {
	const segmentsA = a.split('.')
	const segmentsB = b.split('.')
	const length = Math.max(segmentsA.length, segmentsB.length)
	for (let index = 0; index < length; index++) {
		const difference = getSegmentNumber(segmentsA[index]) - getSegmentNumber(segmentsB[index])
		if (difference !== 0) {
			return Math.sign(difference)
		}
	}

	if (a === b) {
		return 0
	}

	return a < b ? -1 : 1
}

/**
 * Summarize tags. The latest tag is the highest-numbered one with a dot in its
 * name, while the latest version tag is the newest one matching a version
 * pattern.
 */
function getTagInfo(
	tags: Tag[],
): Pick<
	GitStatsInfo,
	| 'tagCount'
	| 'tagDateLatest'
	| 'tagNameLatest'
	| 'tagReleaseCount'
	| 'tagVersionDateLatest'
	| 'tagVersionLatest'
> {
	const latestTag = tags
		.filter((tag) => tag.name.includes('.'))
		.toSorted((a, b) => compareTagVersions(a.name, b.name))
		.at(-1)
	const versionTags = tags.filter((tag) => VERSION_TAG_REGEX.test(tag.name))
	const latestVersionTag = versionTags[0]

	return {
		tagCount: tags.length,
		tagDateLatest: latestTag?.date,
		tagNameLatest: latestTag?.name,
		tagReleaseCount: versionTags.length > 0 ? versionTags.length : undefined,
		tagVersionDateLatest: latestVersionTag?.date,
		tagVersionLatest: latestVersionTag?.name.replace(LEADING_V_REGEX, ''),
	}
}

export const gitStatsSource = defineSource<'gitStats'>({
	async discover(context) {
		return getGitRepositories(context.options)
	},
	key: 'gitStats',
	async parse(input) {
		log.debug('Extracting git statistics metadata...')

		// Start every independent git command at once. The remote comparison
		// waits only on the commands it depends on.
		const historyPromise = getHistory(input)
		const referencesPromise = getReferences(input)
		const remotesPromise = getRemoteNames(input)
		const remoteStatusPromise = (async (): Promise<Record<string, AheadBehind>> => {
			const [history, references, remotes] = await Promise.all([
				historyPromise,
				referencesPromise,
				remotesPromise,
			])
			// An unborn HEAD has nothing to compare
			return history.commitCount > 0 ? getRemoteStatus(input, remotes, references.remoteRefs) : {}
		})()

		const [status, history, references, remotes, remoteStatus, tracked, hasLfs] = await Promise.all(
			[
				getStatus(input),
				historyPromise,
				referencesPromise,
				remotesPromise,
				remoteStatusPromise,
				getTrackedFiles(input),
				hasLfsFiles(input),
			],
		)

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
				// Counts the detached HEAD entry that `git branch --all` lists
				branchCount: references.branchCount + (status.isDetached ? 1 : 0),
				branchCurrent: status.branchCurrent,
				commitCount: history.commitCount,
				commitDateFirst: history.commitDateFirst,
				commitDateLast: history.commitDateLast,
				contributorCount: history.contributorCount,
				hasLfs,
				isClean: status.changedFileCount === 0,
				isDirty: status.changedFileCount > 0,
				isRemoteAhead: remoteStatusValues.some((s) => s.behind > 0) || undefined,
				remoteCount: remotes.length,
				remoteStatus: remoteStatusValues.length > 0 ? remoteStatus : undefined,
				submoduleCount: tracked.submoduleCount,
				...getTagInfo(references.tags),
				totalAhead,
				totalBehind,
				trackedFileCount: tracked.trackedFileCount,
				trackedSizeBytes: tracked.trackedSizeBytes,
				uncommittedFileCount: status.changedFileCount,
				upstreamAhead: status.upstreamAhead,
				upstreamBehind: status.upstreamBehind,
				upstreamBranch: status.upstreamBranch,
			},
			source: input,
		}
	},
	phase: 1,
})
