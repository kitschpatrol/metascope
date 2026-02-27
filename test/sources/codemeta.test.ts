import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { codemetaSource } from '../../src/lib/sources/codemeta'

const context: SourceContext = {
	credentials: {},
	path: resolve('.'),
}

describe('codemeta source', () => {
	it('should always be available', async () => {
		expect(await codemetaSource.isAvailable(context)).toBe(true)
	})

	it('should fetch metadata from package.json', async () => {
		const result = await codemetaSource.extract(context)
		expect(result.name).toBe('metascope')
		expect(result.description).toBeDefined()
	})

	it('should include author info', async () => {
		const result = await codemetaSource.extract(context)
		expect(result.author).toBeDefined()
	})
})
