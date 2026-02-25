import { exec } from 'tinyexec'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

// @case-police-ignore css, gdscript, glsl, graphql, html, json, mdx, php, postcss, sql, svg, tex, toml, xml, yaml

/* eslint-disable perfectionist/sort-union-types -- matching tokei's output key names exactly */
type TokeiLanguage =
	| 'Abap'
	| 'ActionScript'
	| 'Ada'
	| 'Agda'
	| 'Alex'
	| 'Alloy'
	| 'APL'
	| 'Asn1'
	| 'Asp'
	| 'AspNet'
	| 'Assembly'
	| 'AssemblyGAS'
	| 'ATS'
	| 'Autoconf'
	| 'AutoHotKey'
	| 'Automake'
	| 'AWK'
	| 'Bash'
	| 'Batch'
	| 'Bazel'
	| 'Bean'
	| 'Bicep'
	| 'Bitbake'
	| 'BQN'
	| 'BrightScript'
	| 'C'
	| 'C3'
	| 'Cabal'
	| 'Cassius'
	| 'Ceylon'
	| 'CHeader'
	| 'Cil'
	| 'Clojure'
	| 'ClojureC'
	| 'ClojureScript'
	| 'CMake'
	| 'Cobol'
	| 'CoffeeScript'
	| 'Cogent'
	| 'ColdFusion'
	| 'ColdFusionScript'
	| 'Coq'
	| 'Cpp'
	| 'CppHeader'
	| 'Crystal'
	| 'CSharp'
	| 'CShell'
	| 'Css'
	| 'Cuda'
	| 'CUE'
	| 'Cython'
	| 'D'
	| 'D2'
	| 'DAML'
	| 'Dart'
	| 'DeviceTree'
	| 'Dhall'
	| 'Dockerfile'
	| 'DotNetResource'
	| 'DreamMaker'
	| 'Dust'
	| 'Ebuild'
	| 'EdgeDB'
	| 'Edn'
	| 'Elisp'
	| 'Elixir'
	| 'Elm'
	| 'Elvish'
	| 'EmacsDevEnv'
	| 'Emojicode'
	| 'Erlang'
	| 'Factor'
	| 'FEN'
	| 'Fish'
	| 'FlatBuffers'
	| 'ForgeConfig'
	| 'Forth'
	| 'FortranLegacy'
	| 'FortranModern'
	| 'FreeMarker'
	| 'FSharp'
	| 'Fstar'
	| 'GDB'
	| 'GdScript'
	| 'GdShader'
	| 'Gherkin'
	| 'Gleam'
	| 'Glsl'
	| 'Go'
	| 'Graphql'
	| 'Groovy'
	| 'Gwion'
	| 'Hamlet'
	| 'Handlebars'
	| 'Happy'
	| 'Hare'
	| 'Haskell'
	| 'Haxe'
	| 'Hcl'
	| 'Hex'
	| 'Hex0'
	| 'Hex1'
	| 'Hex2'
	| 'HiCAD'
	| 'hledger'
	| 'Hlsl'
	| 'HolyC'
	| 'Html'
	| 'Hy'
	| 'Idris'
	| 'Ini'
	| 'IntelHex'
	| 'Isabelle'
	| 'Jai'
	| 'Janet'
	| 'Java'
	| 'JavaScript'
	| 'Jq'
	| 'Json'
	| 'Jsx'
	| 'Julia'
	| 'Julius'
	| 'Just'
	| 'KakouneScript'
	| 'KaemFile'
	| 'Koka'
	| 'Kotlin'
	| 'Lean'
	| 'Less'
	| 'Lingua Franca'
	| 'LinkerScript'
	| 'Liquid'
	| 'Lisp'
	| 'LLVM'
	| 'Logtalk'
	| 'Lua'
	| 'Lucius'
	| 'M1Assembly'
	| 'Madlang'
	| 'Makefile'
	| 'Markdown'
	| 'Max'
	| 'Mdx'
	| 'Meson'
	| 'Mint'
	| 'Mlatu'
	| 'ModuleDef'
	| 'MonkeyC'
	| 'MoonScript'
	| 'MsBuild'
	| 'Mustache'
	| 'Nim'
	| 'Nix'
	| 'NotQuitePerl'
	| 'NuGetConfig'
	| 'Nushell'
	| 'ObjectiveC'
	| 'ObjectiveCpp'
	| 'OCaml'
	| 'Odin'
	| 'OpenQASM'
	| 'OpenSCAD'
	| 'Org'
	| 'Oz'
	| 'Pascal'
	| 'Perl'
	| 'Perl6'
	| 'Pest'
	| 'Phix'
	| 'Php'
	| 'Plain Text'
	| 'Po'
	| 'Poke'
	| 'Polly'
	| 'Pony'
	| 'PostCss'
	| 'PowerShell'
	| 'Processing'
	| 'Prolog'
	| 'Protobuf'
	| 'PRQL'
	| 'PSL'
	| 'PureScript'
	| 'Pyret'
	| 'Python'
	| 'Qcl'
	| 'Qml'
	| 'R'
	| 'Racket'
	| 'Rakefile'
	| 'Razor'
	| 'Renpy'
	| 'ReStructuredText'
	| 'RON'
	| 'RPMSpecfile'
	| 'Ruby'
	| 'RubyHtml'
	| 'Rust'
	| 'Sass'
	| 'Scala'
	| 'Scheme'
	| 'Scons'
	| 'Sh'
	| 'ShaderLab'
	| 'Slang'
	| 'Slint'
	| 'Sml'
	| 'Solidity'
	| 'SpecmanE'
	| 'Spice'
	| 'Sql'
	| 'SRecode'
	| 'Stata'
	| 'Stratego'
	| 'Svelte'
	| 'Svg'
	| 'Swift'
	| 'Swig'
	| 'SystemVerilog'
	| 'Tact'
	| 'Tcl'
	| 'Templ'
	| 'Tex'
	| 'Text'
	| 'Thrift'
	| 'Toml'
	| 'Total'
	| 'Tsx'
	| 'Twig'
	| 'TypeScript'
	| 'UMPL'
	| 'UnrealDeveloperMarkdown'
	| 'UnrealPlugin'
	| 'UnrealProject'
	| 'UnrealScript'
	| 'UnrealShader'
	| 'UnrealShaderHeader'
	| 'UrWeb'
	| 'UrWebProject'
	| 'Vala'
	| 'VB6'
	| 'VBScript'
	| 'Velocity'
	| 'Verilog'
	| 'VerilogArgsFile'
	| 'Vhdl'
	| 'VimScript'
	| 'VisualBasic'
	| 'VisualStudioProject'
	| 'VisualStudioSolution'
	| 'Vue'
	| 'WebAssembly'
	| 'Wolfram'
	| 'Xaml'
	| 'XcodeConfig'
	| 'Xml'
	| 'XSL'
	| 'Xtend'
	| 'Yaml'
	| 'ZenCode'
	| 'Zig'
	| 'ZoKrates'
	| 'Zsh'
/* eslint-enable perfectionist/sort-union-types */

export type LocLanguageStats = {
	blanks: number
	code: number
	comments: number
	files: number
}

export type LocData = Partial<Record<TokeiLanguage, LocLanguageStats>>

const tokeiEntrySchema = z.object({
	blanks: z.number(),
	code: z.number(),
	comments: z.number(),
	reports: z.array(z.unknown()),
})

const tokeiOutputSchema = z.record(z.string(), tokeiEntrySchema)

function parseTokeiOutput(raw: z.infer<typeof tokeiOutputSchema>): LocData {
	const result: Record<string, LocLanguageStats> = {}

	for (const [language, entry] of Object.entries(raw)) {
		result[language] = {
			blanks: entry.blanks,
			code: entry.code,
			comments: entry.comments,
			files: entry.reports.length,
		}
	}

	// Total's reports is always empty — tokei stores per-file data in children instead.
	// Compute Total's files as the sum of all other languages' file counts.
	if (result.Total.files === 0) {
		let totalFiles = 0
		for (const [language, stats] of Object.entries(result)) {
			if (language !== 'Total') {
				totalFiles += stats.files
			}
		}

		result.Total.files = totalFiles
	}

	return result
}

export const locSource: MetadataSource<'loc'> = {
	async fetch(context: SourceContext): Promise<LocData> {
		log.debug('Fetching lines of code via tokei...')

		const result = await exec('tokei', [context.path, '--compact', '--output', 'json'])
		const raw = tokeiOutputSchema.parse(JSON.parse(result.stdout))
		return parseTokeiOutput(raw)
	},
	async isAvailable(): Promise<boolean> {
		try {
			await exec('tokei', ['--version'])
			return true
		} catch {
			log.info(
				'tokei is not installed. Install it for lines-of-code analysis: https://github.com/XAMPPRocky/tokei',
			)
			return false
		}
	},
	key: 'loc',
}
