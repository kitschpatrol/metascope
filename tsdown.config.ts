import type { Rolldown } from 'tsdown'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'tsdown'

/**
 * Plugin that copies tree-sitter WASM files to the output directory and patches
 * the bundle to resolve grammar paths correctly.
 *
 * web-tree-sitter.wasm goes directly in output directory (web-tree-sitter looks for it
 * relative to the script directory).
 *
 * Grammar WASMs go in output directory/grammars/ and the bundle is patched to reference
 * `./grammars/` instead of `../grammars/` (the original path in the codemeta
 * library's source).
 */
function treeSitterWasmPlugin(): Rolldown.Plugin {
	return {
		name: 'tree-sitter-wasm',
		onLog(_level, log) {
			// Suppress EVAL warnings from web-tree-sitter's use of direct eval
			if (log.code === 'EVAL' && log.id?.includes('web-tree-sitter')) return false
		},
		async writeBundle(options) {
			const outDirectory = options.dir ?? 'dist'
			const grammarsDirectory = join(outDirectory, 'grammars')
			await mkdir(grammarsDirectory, { recursive: true })

			// Find web-tree-sitter.wasm (transitive dep via @kitschpatrol/codemeta)
			const webTsDirectory = await findPackageDirectory('web-tree-sitter')
			await copyFile(
				join(webTsDirectory, 'web-tree-sitter.wasm'),
				join(outDirectory, 'web-tree-sitter.wasm'),
			)

			// Copy grammar WASMs from codemeta's vendored grammars
			const codemetaGrammars = join('node_modules', '@kitschpatrol', 'codemeta', 'dist', 'grammars')
			// eslint-disable-next-line unicorn/no-await-expression-member
			const wasmFiles = (await readdir(codemetaGrammars)).filter((f) => f.endsWith('.wasm'))
			await Promise.all(
				wasmFiles.map(async (f) => copyFile(join(codemetaGrammars, f), join(grammarsDirectory, f))),
			)

			// Patch the bundle: change '../grammars/' to './grammars/' so the paths
			// resolve relative to the output directory instead of a non-existent parent
			const bundlePath = join(outDirectory, 'cli.js')
			const content = await readFile(bundlePath, 'utf8')
			await writeFile(bundlePath, content.replaceAll('../grammars/', './grammars/'))
		},
	}
}

/** Walk up from node_modules to find a package directory by name. */
async function findPackageDirectory(packageName: string): Promise<string> {
	const entries = await readdir('node_modules/.pnpm', { withFileTypes: true })
	for (const entry of entries) {
		if (entry.isDirectory() && entry.name.startsWith(`${packageName}@`)) {
			const candidate = join('node_modules/.pnpm', entry.name, 'node_modules', packageName)
			try {
				await readdir(candidate)
				return candidate
			} catch {
				// Continue searching
			}
		}
	}

	throw new Error(`Could not find package: ${packageName}`)
}

export default defineConfig([
	// CLI tool
	{
		dts: false,
		entry: 'src/bin/cli.ts',
		fixedExtension: false,
		inlineOnly: false,
		minify: true,
		noExternal: /.+/,
		outDir: 'dist/bin',
		platform: 'node',
		plugins: [treeSitterWasmPlugin()],
	},
	// Library
	{
		attw: {
			profile: 'esm-only',
		},
		dts: true,
		entry: 'src/lib/index.ts',
		fixedExtension: false,
		outDir: 'dist/lib',
		platform: 'node',
		// TODO re-enable
		// publint: true,
		tsconfig: 'tsconfig.build.json',
	},
])
