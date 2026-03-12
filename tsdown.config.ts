import { defineConfig } from 'tsdown'

export default defineConfig([
	// CLI tool
	{
		copy: [
			{
				from: 'node_modules/web-tree-sitter/web-tree-sitter.wasm',
				to: 'dist/bin',
			},
			{
				from: 'node_modules/web-tree-sitter/LICENSE',
				rename: 'web-tree-sitter-LICENSE',
				to: 'dist/bin',
			},
		],
		deps: {
			alwaysBundle: /.+/,
			neverBundle: ['@kitschpatrol/tokei'],
			onlyBundle: false,
		},
		dts: false,
		entry: 'src/bin/cli.ts',
		fixedExtension: false,
		inputOptions: {
			checks: {
				// In web-tree-sitter...
				eval: false,
			},
		},
		minify: true,
		outDir: 'dist/bin',
		platform: 'node',
	},
	// Library
	{
		attw: {
			profile: 'esm-only',
		},
		copy: [
			{
				from: [
					'node_modules/tree-sitter-ruby/tree-sitter-ruby.wasm',
					'node_modules/tree-sitter-python/tree-sitter-python.wasm',
				],
				to: 'dist/grammars',
			},
			{
				from: 'node_modules/tree-sitter-ruby/LICENSE',
				rename: 'tree-sitter-ruby-LICENSE',
				to: 'dist/grammars',
			},
			{
				from: 'node_modules/tree-sitter-python/LICENSE',
				rename: 'tree-sitter-python-LICENSE',
				to: 'dist/grammars',
			},
		],
		dts: true,
		entry: 'src/lib/index.ts',
		fixedExtension: false,
		outDir: 'dist/lib',
		platform: 'node',
		publint: true,
		tsconfig: 'tsconfig.build.json',
		unbundle: true,
	},
])
