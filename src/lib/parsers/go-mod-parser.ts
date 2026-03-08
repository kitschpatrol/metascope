/* eslint-disable ts/naming-convention */
import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

// ─── Types ───────────────────────────────────────────────────────────────────

const goModDependencySchema = z.object({
	module: z.string(),
	version: z.string(),
})

const goModDataSchema = z.object({
	dependencies: z.array(goModDependencySchema),
	go_version: nonEmptyString,
	module: nonEmptyString,
	repository_url: optionalUrl,
	tool_dependencies: stringArray,
})

export type GoModDependency = z.infer<typeof goModDependencySchema>

/** Parsed go.mod metadata */
export type GoModData = z.infer<typeof goModDataSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

type BlockState = 'none' | 'replace' | 'require' | 'skip' | 'tool'

type Replacement = 'local' | { module: string; version: string }

/**
 * Known source-repo hosts and the number of path segments that make a repo URL.
 * e.g. github.com/owner/repo → 3 segments.
 */
const HOST_SEGMENTS: Record<string, number> = {
	'bitbucket.com': 3,
	'bitbucket.org': 3,
	'codeberg.org': 3,
	'git.sr.ht': 3,
	'github.com': 3,
	'gitlab.com': 3,
}

/** Derive a repository URL from a Go module path, if on a known host. */
function moduleToRepoUrl(modulePath: string): string | undefined {
	const segments = modulePath.split('/')
	const host = segments[0]
	if (!host) return undefined

	const needed = HOST_SEGMENTS[host]
	if (!needed || segments.length < needed) return undefined

	let repoPath = segments.slice(0, needed).join('/')
	// Strip /vN major-version suffix
	repoPath = repoPath.replace(/\/v\d+$/, '')

	return `https://${repoPath}`
}

/** Strip inline comments and trim whitespace. */
function stripComment(line: string): string {
	const index = line.indexOf('//')
	return index === -1 ? line.trim() : line.slice(0, index).trim()
}

/** Check whether a line has an `// indirect` comment. */
function isIndirect(line: string): boolean {
	return /\/\/\s*indirect/.test(line)
}

/** Parse a require-style line: `module version [// indirect]` */
function parseRequireLine(
	line: string,
): undefined | { indirect: boolean; module: string; version: string } {
	const indirect = isIndirect(line)
	const clean = stripComment(line)
	const match = /^(\S+)\s+(\S+)/.exec(clean)
	if (!match) return undefined
	const version = match[2].replace(/\+incompatible$/, '')
	return { indirect, module: match[1], version }
}

/** Parse a replace-style line: `old [version] => new version` or `old [version] => ./local` */
function parseReplaceLine(line: string): undefined | { from: string; to: Replacement } {
	const clean = stripComment(line)
	const parts = clean.split('=>')
	if (parts.length !== 2) return undefined

	const left = parts[0].trim().split(/\s+/)
	const right = parts[1].trim().split(/\s+/)

	const from = left[0]
	if (!from || right.length === 0) return undefined

	const target = right[0]
	if (!target) return undefined

	if (target.startsWith('./') || target.startsWith('../') || target.startsWith('/')) {
		return { from, to: 'local' }
	}

	const version = right[1] ?? ''
	return { from, to: { module: target, version: version.replace(/\+incompatible$/, '') } }
}

/** Parse a tool-style line: just a module path. */
function parseToolLine(line: string): string | undefined {
	const clean = stripComment(line).trim()
	if (clean.length === 0) return undefined
	return clean.split(/\s+/)[0] || undefined
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a go.mod file and return structured metadata.
 *
 * Extracts module identity, Go version, direct dependencies (skipping
 * indirect ones), tool dependencies, and applies replace directives.
 */
export function parseGoMod(source: string): GoModData {
	const data: GoModData = {
		dependencies: [],
		go_version: undefined,
		module: undefined,
		repository_url: undefined,
		tool_dependencies: [],
	}

	const directDeps: Record<string, string> = {}
	const toolDeps: string[] = []
	const replacements = new Map<string, Replacement>()

	let blockState: BlockState = 'none'

	for (const rawLine of source.split('\n')) {
		const line = rawLine.trim()

		// Skip empty lines and pure comments outside blocks
		if (line === '' || (line.startsWith('//') && blockState === 'none')) continue

		// Block close
		if (line === ')' || line.startsWith(')')) {
			blockState = 'none'
			continue
		}

		// Inside a block
		if (blockState !== 'none') {
			switch (blockState) {
				case 'replace': {
					const rep = parseReplaceLine(line)
					if (rep) replacements.set(rep.from, rep.to)
					break
				}

				case 'require': {
					const dep = parseRequireLine(line)
					if (dep && !dep.indirect) directDeps[dep.module] = dep.version
					break
				}

				case 'skip': {
					break
				}

				case 'tool': {
					const tool = parseToolLine(line)
					if (tool) toolDeps.push(tool)
					break
				}
			}

			continue
		}

		// Top-level directives
		if (line.startsWith('module ')) {
			data.module = line.slice('module '.length).trim()
		} else if (line.startsWith('go ')) {
			data.go_version = line.slice('go '.length).trim()
		} else if (line.startsWith('require ')) {
			if (line.includes('(')) {
				blockState = 'require'
			} else {
				const dep = parseRequireLine(line.slice('require '.length))
				if (dep && !dep.indirect) directDeps[dep.module] = dep.version
			}
		} else if (line.startsWith('replace ')) {
			if (line.includes('(')) {
				blockState = 'replace'
			} else {
				const rep = parseReplaceLine(line.slice('replace '.length))
				if (rep) replacements.set(rep.from, rep.to)
			}
		} else if (line.startsWith('tool ')) {
			if (line.includes('(')) {
				blockState = 'tool'
			} else {
				const tool = parseToolLine(line.slice('tool '.length))
				if (tool) toolDeps.push(tool)
			}
		} else if (
			(line.startsWith('exclude ') ||
				line.startsWith('retract ') ||
				line.startsWith('godebug ') ||
				line.startsWith('toolchain ')) &&
			line.includes('(')
		) {
			blockState = 'skip'
		}
	}

	// Apply replacements
	for (const [from, to] of replacements) {
		if (from in directDeps) {
			// eslint-disable-next-line ts/no-dynamic-delete
			delete directDeps[from]
			if (to !== 'local') {
				directDeps[to.module] = to.version
			}
		}
	}

	// Convert deps map to array
	data.dependencies = Object.entries(directDeps).map(([module, version]) => ({ module, version }))
	data.tool_dependencies = toolDeps

	// Derive repository URL
	if (data.module) {
		data.repository_url = moduleToRepoUrl(data.module)
	}

	return goModDataSchema.parse(data)
}
