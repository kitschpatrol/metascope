/**
 * Shared WASM loader for web-tree-sitter.
 * Provides singleton initialization and cached language loading.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Language, Parser } from 'web-tree-sitter'

let initialized = false

/** Resolve a grammar WASM file path relative to the dist/ directory. */
function resolveGrammar(filename: string): string {
	const thisDirectory = dirname(fileURLToPath(import.meta.url))
	// Walk up to find the dist/ directory, then resolve grammars/ within it.
	// Works from both dist/lib/utilities/ (unbundled library) and dist/bin/ (bundled CLI).
	// Falls back to ../../grammars/ for source/test context (src/lib/utilities/).
	const distributionDirectory = thisDirectory.includes('/dist/')
		? thisDirectory.slice(0, thisDirectory.indexOf('/dist/') + '/dist'.length)
		: resolve(thisDirectory, '..', '..')
	return resolve(distributionDirectory, 'grammars', filename)
}

/** Initialize web-tree-sitter (idempotent) and return a new Parser instance. */
export async function initParser(): Promise<Parser> {
	if (!initialized) {
		await Parser.init()
		initialized = true
	}
	return new Parser()
}

let pythonLanguage: Language | undefined
/** Get the Python language (cached after first load). */
export async function getPythonLanguage(): Promise<Language> {
	pythonLanguage ??= await Language.load(resolveGrammar('tree-sitter-python.wasm'))
	return pythonLanguage
}

let rubyLanguage: Language | undefined
/** Get the Ruby language (cached after first load). */
export async function getRubyLanguage(): Promise<Language> {
	rubyLanguage ??= await Language.load(resolveGrammar('tree-sitter-ruby.wasm'))
	return rubyLanguage
}
