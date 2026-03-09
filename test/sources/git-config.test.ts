import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { gitConfigSource } from '../../src/lib/sources/git-config'

const context: SourceContext = {
	credentials: {},
	path: resolve('.'),
}

describe('git config source', () => {
	it('should be available in a git repo', async () => {
		expect(await gitConfigSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a non-git directory', async () => {
		const nonGitContext: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await gitConfigSource.isAvailable(nonGitContext)).toBe(false)
	})

	it('should fetch git config metadata', async () => {
		const result = await gitConfigSource.extract(context)

		expect(result).toBeDefined()
		expect(result!.data.config).toBeDefined()
		expect(typeof result!.data.config?.remote?.origin.url).toBe('string')
	})
})
