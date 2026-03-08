/**
 * Shared WASM loader for web-tree-sitter.
 * Provides singleton initialization and cached language loading.
 */

import { fileURLToPath } from 'node:url'
import { Language, Parser } from 'web-tree-sitter'

let initialized = false

/** Initialize web-tree-sitter (idempotent) and return a new Parser instance. */
export async function initParser(): Promise<Parser> {
	if (!initialized) {
		await Parser.init()
		initialized = true
	}
	return new Parser()
}

let rubyLanguage: Language | undefined
/** Get the Ruby language (cached after first load). */
export async function getRubyLanguage(): Promise<Language> {
	rubyLanguage ??= await Language.load(
		fileURLToPath(new URL('../grammars/tree-sitter-ruby.wasm', import.meta.url)),
	)
	return rubyLanguage
}
