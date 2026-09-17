/**
 * Shared WASM loader for web-tree-sitter. Provides singleton initialization and
 * cached language loading.
 */

import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Language, Parser } from 'web-tree-sitter'

let initialization: Promise<void> | undefined
let grammarDirectoryOverride: string | undefined

/**
 * Override the directory where tree-sitter WASM grammars are loaded from. Can
 * be useful in commonjs projects.
 */
export function setGrammarDirectory(directory: string): void {
	grammarDirectoryOverride = directory
}

/**
 * Find the grammar directory from a module's directory path. Exported for
 * testing — not part of the public API.
 */
export function findGrammarDirectory(moduleDirectory: string): string {
	// Walk up to find the dist/ directory, then resolve grammars/ within it.
	// Works from both dist/lib/utilities/ (unbundled library) and dist/bin/ (bundled CLI).
	// Falls back to ../../grammars/ for source/test context (src/lib/utilities/).
	const distributionSegment = `${sep}dist${sep}`
	const distributionDirectory = moduleDirectory.includes(distributionSegment)
		? moduleDirectory.slice(
				0,
				moduleDirectory.indexOf(distributionSegment) + distributionSegment.length - 1,
			)
		: resolve(moduleDirectory, '..', '..')
	return resolve(distributionDirectory, 'grammars')
}

/** Resolve a grammar WASM file path relative to the dist/ directory. */
function resolveGrammar(filename: string): string {
	if (grammarDirectoryOverride !== undefined && grammarDirectoryOverride !== '') {
		return resolve(grammarDirectoryOverride, filename)
	}

	const thisDirectory = dirname(fileURLToPath(import.meta.url))
	return resolve(findGrammarDirectory(thisDirectory), filename)
}

/** Initialize web-tree-sitter (idempotent) and return a new Parser instance. */
export async function initParser(): Promise<Parser> {
	// Cache the pending initialization too: sources can start parsing concurrently.
	// eslint-disable-next-line unicorn/prefer-await -- Share rejection handling across concurrent callers.
	initialization ??= Parser.init().catch((error: unknown) => {
		initialization = undefined
		throw error
	})
	await initialization

	return new Parser()
}

let pythonLanguage: Promise<Language> | undefined
/** Get the Python language (cached after first load). */
export async function getPythonLanguage(): Promise<Language> {
	// eslint-disable-next-line unicorn/prefer-await -- Share rejection handling across concurrent callers.
	pythonLanguage ??= Language.load(resolveGrammar('tree-sitter-python.wasm')).catch(
		(error: unknown) => {
			pythonLanguage = undefined
			throw error
		},
	)
	return pythonLanguage
}

let rubyLanguage: Promise<Language> | undefined
/** Get the Ruby language (cached after first load). */
export async function getRubyLanguage(): Promise<Language> {
	// eslint-disable-next-line unicorn/prefer-await -- Share rejection handling across concurrent callers.
	rubyLanguage ??= Language.load(resolveGrammar('tree-sitter-ruby.wasm')).catch(
		(error: unknown) => {
			rubyLanguage = undefined
			throw error
		},
	)
	return rubyLanguage
}
