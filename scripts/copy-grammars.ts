/**
 * Copy tree-sitter WASM grammar files from node_modules to src/grammars/.
 * Cross-platform replacement for the shell-based pretest copy command.
 */

import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const destinationDirectory = resolve(projectRoot, 'src/grammars')

const grammars = [
	{ from: 'node_modules/tree-sitter-ruby/tree-sitter-ruby.wasm', name: 'tree-sitter-ruby.wasm' },
	{
		from: 'node_modules/tree-sitter-python/tree-sitter-python.wasm',
		name: 'tree-sitter-python.wasm',
	},
]

await mkdir(destinationDirectory, { recursive: true })

await Promise.all(
	grammars.map(async ({ from, name }) => {
		const source = resolve(projectRoot, from)
		const destination = resolve(destinationDirectory, name)
		await copyFile(source, destination)
		console.log(`Copied ${name}`)
	}),
)
