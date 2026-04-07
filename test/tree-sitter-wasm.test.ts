import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findGrammarDirectory } from '../src/lib/utilities/tree-sitter-wasm'

// Build platform-correct absolute paths for testing
const root = sep === '\\' ? String.raw`C:\project` : '/project'
const path = (...segments: string[]) => resolve(root, ...segments)

describe('findGrammarDirectory', () => {
	it('should resolve grammars from dist/lib/utilities (unbundled library)', () => {
		expect(findGrammarDirectory(path('dist', 'lib', 'utilities'))).toBe(path('dist', 'grammars'))
	})

	it('should resolve grammars from dist/bin (bundled CLI)', () => {
		expect(findGrammarDirectory(path('dist', 'bin'))).toBe(path('dist', 'grammars'))
	})

	it('should fall back to ../../grammars for source/test context', () => {
		const result = findGrammarDirectory(path('src', 'lib', 'utilities'))
		expect(result).toContain('grammars')
		expect(result).not.toContain('dist')
	})

	if (sep === '/') {
		it('should handle unix-style dist paths', () => {
			expect(findGrammarDirectory('/home/user/project/dist/lib/utilities')).toBe(
				'/home/user/project/dist/grammars',
			)
		})
	}

	if (sep === '\\') {
		it('should handle windows-style dist paths', () => {
			expect(findGrammarDirectory(String.raw`D:\a\project\dist\lib\utilities`)).toBe(
				String.raw`D:\a\project\dist\grammars`,
			)
		})

		it('should handle windows-style dist paths in deeply nested directories', () => {
			expect(findGrammarDirectory(String.raw`D:\a\repo\repo\dist\bin`)).toBe(
				String.raw`D:\a\repo\repo\dist\grammars`,
			)
		})
	}
})
