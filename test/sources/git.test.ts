import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { gitSource } from '../../src/lib/sources/git'

const context: SourceContext = {
	credentials: {},
	path: resolve('.'),
}

describe('git source', () => {
	it('should be available in a git repo', async () => {
		expect(await gitSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a non-git directory', async () => {
		const nonGitContext: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await gitSource.isAvailable(nonGitContext)).toBe(false)
	})

	it('should fetch git metadata', async () => {
		const result = await gitSource.extract(context)

		expect(result.branchCurrent).toBe('main')
		expect(result.commitCount).toBeGreaterThanOrEqual(1)
		expect(result.branchCount).toBeGreaterThanOrEqual(1)
		expect(result.contributorCount).toBeGreaterThanOrEqual(1)
		expect(result.trackedFileCount).toBeGreaterThan(0)
		expect(typeof result.isClean).toBe('boolean')
		expect(result.isDirty).toBe(!result.isClean)
		expect(result.tagCount).toBeGreaterThanOrEqual(0)
	})

	it('should return a valid commitDateLast', async () => {
		const result = await gitSource.extract(context)
		expect(result.commitDateLast).toBeDefined()
		// Should be a valid date string
		expect(Number.isNaN(Date.parse(result.commitDateLast!))).toBe(false)
	})
})
