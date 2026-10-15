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

async function git(cwd: string, ...gitArguments: string[]): Promise<void> {
	await exec('git', gitArguments, { nodeOptions: { cwd }, throwOnError: true })
}

async function commit(cwd: string): Promise<void> {
	await git(
		cwd,
		'-c',
		'user.name=Test',
		'-c',
		'user.email=test@example.com',
		'commit',
		'-q',
		'--allow-empty',
		'-m',
		'Commit',
	)
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

	describe('in temporary repositories', () => {
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
