import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { gitConfigSource } from '../../src/lib/sources/git-config'

const context: SourceContext = {
	context: {},
	credentials: {},
	fileTree: [],
	offline: false,
	path: resolve('.'),
}

describe('git config source', () => {
	it('should be available in a git repo', async () => {
		expect(await gitConfigSource.extract(context)).toBeDefined()
	})

	it('should not be available in a non-git directory', async () => {
		const nonGitContext: SourceContext = {
			context: {},
			credentials: {},
			fileTree: [],
			offline: false,
			path: '/tmp',
		}
		expect(await gitConfigSource.extract(nonGitContext)).toBeUndefined()
	})

	it('should fetch git config metadata', async () => {
		const result = await gitConfigSource.extract(context)

		expect(result).toBeDefined()
		expect(result!.data.config).toBeDefined()
		expect(typeof result!.data.config?.remote?.origin.url).toBe('string')
	})
})
