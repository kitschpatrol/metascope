import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gitStatsSource } from '../../src/lib/sources/git-stats'
import { firstOf } from '../../src/lib/utilities/formatting'

const context = { options: { path: resolve('.') } }

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
		expect(result!.data.branchCurrent).toBe('main')
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
})
