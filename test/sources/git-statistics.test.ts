import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetMatchCache } from '../../src/lib/file-matching'
import { gitStatsSource } from '../../src/lib/sources/git-stats'
import { firstOf } from '../../src/lib/utilities/template-helpers'

const context = { options: { path: resolve('.') } }
const nonEmptyBranch = /\S/v

type Identity = { date?: string; email?: string }

async function git(cwd: string, ...gitArguments: string[]): Promise<void> {
	await exec('git', gitArguments, { nodeOptions: { cwd }, throwOnError: true })
}

async function gitAs(
	cwd: string,
	{ date, email = 'test@example.com' }: Identity,
	...gitArguments: string[]
): Promise<void> {
	const dates =
		date === undefined
			? {}
			: // eslint-disable-next-line ts/naming-convention -- Environment variables
				{ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
	await exec('git', ['-c', 'user.name=Test', '-c', `user.email=${email}`, ...gitArguments], {
		nodeOptions: { cwd, env: { ...process.env, ...dates } },
		throwOnError: true,
	})
}

async function commit(cwd: string, message = 'Commit', identity: Identity = {}): Promise<void> {
	await gitAs(cwd, identity, 'commit', '-q', '--allow-empty', '-m', message)
}

describe('git statistics source', () => {
	it('should be available in a git repo', async () => {
		expect(await gitStatsSource.extract(context)).toBeDefined()
	})

	it('should not be available in a non-git directory', async () => {
		const nonGitContext = { options: { path: '/tmp' } }
		expect(await gitStatsSource.extract(nonGitContext)).toBeUndefined()
	})

	it('should fetch git statistics metadata', async () => {
		const result = firstOf(await gitStatsSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.data.branchCurrent).toMatch(nonEmptyBranch)
		expect(result!.data.commitCount).toBeGreaterThanOrEqual(1)
		expect(result!.data.branchCount).toBeGreaterThanOrEqual(1)
		expect(result!.data.contributorCount).toBeGreaterThanOrEqual(1)
		expect(result!.data.trackedFileCount).toBeGreaterThan(0)
		expect(typeof result!.data.isClean).toBe('boolean')
		expect(result!.data.isDirty).toBe(!result!.data.isClean)
		expect(result!.data.tagCount).toBeGreaterThanOrEqual(0)
	})

	it('should return a valid commitDateLast', async () => {
		const result = firstOf(await gitStatsSource.extract(context))
		expect(result).toBeDefined()
		expect(result!.data.commitDateLast).toBeDefined()
		// Should be a valid date string
		expect(Number.isNaN(Date.parse(result!.data.commitDateLast!))).toBe(false)
	})

	// Each test runs a dozen or more git commands, which can exceed the default
	// timeout on a busy machine
	describe('in temporary repositories', { timeout: 30_000 }, () => {
		let root: string

		beforeEach(async () => {
			resetMatchCache()
			root = await mkdtemp(join(tmpdir(), 'metascope-git-stats-'))
			await git(root, 'init', '-q', '-b', 'main')
		})

		afterEach(async () => {
			await rm(root, { force: true, recursive: true })
		})

		it('should report a repository without commits', async () => {
			await writeFile(join(root, 'staged.txt'), 'staged\n')
			await git(root, 'add', 'staged.txt')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({
				branchCount: 0,
				branchCurrent: 'main',
				commitCount: 0,
				contributorCount: 0,
				isDirty: true,
				tagCount: 0,
				trackedFileCount: 1,
				trackedSizeBytes: 7,
				uncommittedFileCount: 1,
			})
			expect(result?.data.commitDateFirst).toBeUndefined()
			expect(result?.data.commitDateLast).toBeUndefined()
		})

		it('should report a linked worktree', async () => {
			await writeFile(join(root, 'readme.md'), '# Root\n')
			await git(root, 'add', 'readme.md')
			await commit(root)
			const linked = join(root, 'linked')
			await git(root, 'worktree', 'add', '-q', '-b', 'feature', linked)

			const result = firstOf(await gitStatsSource.extract({ options: { path: linked } }))

			expect(result?.data).toMatchObject({
				branchCurrent: 'feature',
				commitCount: 1,
				isClean: true,
				trackedFileCount: 1,
			})
		})

		it('should compare the current branch with its upstream only', async () => {
			const remote = await mkdtemp(join(tmpdir(), 'metascope-git-stats-remote-'))
			try {
				await git(remote, 'init', '-q', '--bare')
				await commit(root)
				await commit(root)
				await git(root, 'remote', 'add', 'origin', remote)
				await git(root, 'remote', 'add', 'upstream', remote)
				await git(root, 'push', '-q', '-u', 'origin', 'main')
				await git(root, 'fetch', '-q', 'upstream')
				await git(root, 'reset', '-q', '--hard', 'HEAD~1')
				await commit(root, 'Diverge')

				const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

				expect(result?.data).toMatchObject({
					totalAhead: 2,
					totalBehind: 2,
					upstreamAhead: 1,
					upstreamBehind: 1,
					upstreamBranch: 'origin/main',
				})
			} finally {
				await rm(remote, { force: true, recursive: true })
			}
		})

		it('should omit upstream fields without an upstream', async () => {
			await commit(root)

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data.upstreamBranch).toBeUndefined()
			expect(result?.data.upstreamAhead).toBeUndefined()
			expect(result?.data.upstreamBehind).toBeUndefined()
		})

		it('should omit upstream counts when the upstream ref is missing', async () => {
			await commit(root)
			await git(root, 'remote', 'add', 'origin', join(root, 'missing.git'))
			await git(root, 'config', 'branch.main.remote', 'origin')
			await git(root, 'config', 'branch.main.merge', 'refs/heads/deleted')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data.upstreamBranch).toBe('origin/deleted')
			expect(result?.data.upstreamAhead).toBeUndefined()
			expect(result?.data.upstreamBehind).toBeUndefined()
		})

		it('should read commit history', async () => {
			await commit(root, 'First', { date: '2020-01-01T12:00:00-05:00', email: 'a@example.com' })
			await commit(root, 'Second', { date: '2021-01-01T12:00:00-05:00', email: 'b@example.com' })
			await commit(root, 'Third', { date: '2022-01-01T12:00:00-05:00', email: 'a@example.com' })

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({
				commitCount: 3,
				commitDateFirst: '2020-01-01T12:00:00-05:00',
				commitDateLast: '2022-01-01T12:00:00-05:00',
				contributorCount: 2,
			})
		})

		it('should summarize tags', async () => {
			await commit(root, 'First', { date: '2020-01-01T12:00:00-05:00' })
			await gitAs(root, { date: '2021-01-01T12:00:00-05:00' }, 'tag', '-a', 'v10.0.0', '-m', 'Ten')
			await commit(root, 'Second', { date: '2022-01-01T12:00:00-05:00' })
			await git(root, 'tag', 'v2')
			await git(root, 'tag', 'v2.0.0')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({
				tagCount: 3,
				// Author date of the commit the annotated tag points to
				tagDateLatest: '2020-01-01T12:00:00-05:00',
				// Highest version number, regardless of major-only tags like v2
				tagNameLatest: 'v10.0.0',
				tagReleaseCount: 2,
				// Most recently created version tag
				tagVersionDateLatest: '2022-01-01T12:00:00-05:00',
				tagVersionLatest: '2.0.0',
			})
		})

		it('should name the ref a detached HEAD was checked out from', async () => {
			await commit(root)
			await git(root, 'tag', 'v1.0.0')
			await commit(root)
			await git(root, 'checkout', '-q', 'v1.0.0')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({
				// Counts main and the detached HEAD entry, as `git branch --all` lists them
				branchCount: 2,
				branchCurrent: 'v1.0.0',
			})
		})

		it('should count each changed file once', async () => {
			await writeFile(join(root, 'old.txt'), 'old\n')
			await git(root, 'add', 'old.txt')
			await commit(root)
			await git(root, 'mv', 'old.txt', 'new.txt')
			await mkdir(join(root, 'untracked', 'nested'), { recursive: true })
			await writeFile(join(root, 'untracked', 'a.txt'), '')
			await writeFile(join(root, 'untracked', 'nested', 'b.txt'), '')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({
				isClean: false,
				isDirty: true,
				uncommittedFileCount: 3,
			})
		})

		it('should measure tracked files with non-ASCII names', async () => {
			await writeFile(join(root, 'notes – draft.txt'), 'data\n')
			await git(root, 'add', '.')

			const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

			expect(result?.data).toMatchObject({ trackedFileCount: 1, trackedSizeBytes: 5 })
		})

		it('should count only submodules registered in .gitmodules', async () => {
			const library = await mkdtemp(join(tmpdir(), 'metascope-git-stats-library-'))
			try {
				await git(library, 'init', '-q', '-b', 'main')
				await commit(library)
				await commit(root)
				await git(
					root,
					'-c',
					'protocol.file.allow=always',
					'submodule',
					'add',
					'-q',
					library,
					'registered',
				)
				const embedded = join(root, 'embedded')
				await mkdir(embedded)
				await git(embedded, 'init', '-q', '-b', 'main')
				await commit(embedded)
				await git(root, 'add', 'embedded')

				const result = firstOf(await gitStatsSource.extract({ options: { path: root } }))

				expect(result?.data.submoduleCount).toBe(1)
			} finally {
				await rm(library, { force: true, recursive: true })
			}
		})

		it('should detect Git LFS from gitattributes', async () => {
			await writeFile(join(root, 'data.bin'), 'data')
			await git(root, 'add', 'data.bin')

			const before = firstOf(await gitStatsSource.extract({ options: { path: root } }))
			expect(before?.data.hasLfs).toBeUndefined()

			// Written after staging, so adding data.bin never runs the LFS filter
			await writeFile(join(root, '.gitattributes'), '*.bin filter=lfs diff=lfs merge=lfs -text\n')

			const after = firstOf(await gitStatsSource.extract({ options: { path: root } }))
			expect(after?.data.hasLfs).toBe(true)
		})

		it('should measure tracked file sizes within each nested repository', async () => {
			await commit(root)
			const nested = join(root, 'nested')
			await mkdir(nested)
			await git(nested, 'init', '-q', '-b', 'main')
			await writeFile(join(nested, 'data.bin'), Buffer.alloc(5000))
			await git(nested, 'add', 'data.bin')
			await commit(nested)

			const results = await gitStatsSource.extract({
				options: { absolute: false, path: root, recursive: true },
			})

			const records = Array.isArray(results) ? results : []
			const nestedRecord = records.find((record) => record.source === 'nested')
			expect(nestedRecord?.data.trackedSizeBytes).toBe(5000)
		})
	})
})
