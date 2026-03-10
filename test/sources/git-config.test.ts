import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gitConfigSource } from '../../src/lib/sources/git-config'
import { firstOf } from '../../src/lib/utilities/formatting'

const context = { options: { path: resolve('.') } }

describe('git config source', () => {
	it('should be available in a git repo', async () => {
		expect(await gitConfigSource.extract(context)).toBeDefined()
	})

	it('should not be available in a non-git directory', async () => {
		const temporaryDirectory = mkdtempSync(join(tmpdir(), 'git-config-test-'))
		const nonGitContext = { options: { path: temporaryDirectory } }
		expect(await gitConfigSource.extract(nonGitContext)).toBeUndefined()
	})

	it('should fetch git config metadata', async () => {
		const result = firstOf(await gitConfigSource.extract(context))

		expect(result).toBeDefined()
		expect(result!.data).toBeDefined()
		expect(typeof result!.data.remote?.origin.url).toBe('string')
	})
})
