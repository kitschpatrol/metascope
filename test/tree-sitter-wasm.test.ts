import { resolve, sep } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { Language, Parser } from 'web-tree-sitter'
import {
	findGrammarDirectory,
	getPythonLanguage,
	getRubyLanguage,
	initParser,
} from '../src/lib/utilities/tree-sitter-wasm'

// Build platform-correct absolute paths for testing
const root = sep === '\\' ? String.raw`C:\project` : '/project'
const path = (...segments: string[]) => resolve(root, ...segments)

it('shares concurrent initialization and retries after a failed attempt', async () => {
	const initialization = vi
		.spyOn(Parser, 'init')
		.mockRejectedValueOnce(new Error('WASM unavailable'))
	const languageLoading = vi.spyOn(Language, 'load')
	try {
		await expect(Promise.all([initParser(), initParser()])).rejects.toThrow('WASM unavailable')
		expect(initialization).toHaveBeenCalledTimes(1)

		const [pythonParser, rubyParser] = await Promise.all([initParser(), initParser()])
		try {
			expect(initialization).toHaveBeenCalledTimes(2)
			expect(pythonParser).not.toBe(rubyParser)
			const [python, samePython, ruby, sameRuby] = await Promise.all([
				getPythonLanguage(),
				getPythonLanguage(),
				getRubyLanguage(),
				getRubyLanguage(),
			])
			expect(languageLoading).toHaveBeenCalledTimes(2)
			expect(python).toBe(samePython)
			expect(ruby).toBe(sameRuby)
			pythonParser.setLanguage(python)
			rubyParser.setLanguage(ruby)

			const pythonTree = pythonParser.parse('name = "python"')
			const rubyTree = rubyParser.parse('name = "ruby"')
			try {
				expect(pythonTree?.rootNode.hasError).toBe(false)
				expect(rubyTree?.rootNode.hasError).toBe(false)
			} finally {
				pythonTree?.delete()
				rubyTree?.delete()
			}
		} finally {
			pythonParser.delete()
			rubyParser.delete()
		}
	} finally {
		initialization.mockRestore()
		languageLoading.mockRestore()
	}
})

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
	} else {
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
