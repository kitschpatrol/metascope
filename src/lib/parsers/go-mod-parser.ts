/* eslint-disable complexity */
/* eslint-disable ts/naming-convention */

const MAJOR_VERSION_SUFFIX_REGEX = /\/v\d+$/v
const INDIRECT_COMMENT_REGEX = /\/\/\s*indirect/v
const MODULE_VERSION_REGEX = /^(\S+)\s+(\S+)/v
const INCOMPATIBLE_SUFFIX_REGEX = /\+incompatible$/v
const WHITESPACE_REGEX = /\s+/v

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
	if (host === undefined || host === '') {
		return undefined
	}

	const needed = HOST_SEGMENTS[host]
	if (needed === undefined || needed === 0 || segments.length < needed) {
		return undefined
	}

	let repoPath = segments.slice(0, needed).join('/')
	// Strip /vN major-version suffix
	repoPath = repoPath.replace(MAJOR_VERSION_SUFFIX_REGEX, '')

	return `https://${repoPath}`
}

/** Strip inline comments and trim whitespace. */
function stripComment(line: string): string {
	const index = line.indexOf('//')
	return index === -1 ? line.trim() : line.slice(0, index).trim()
}

/** Check whether a line has an `// indirect` comment. */
function isIndirect(line: string): boolean {
	return INDIRECT_COMMENT_REGEX.test(line)
}

/** Parse a require-style line: `module version [// indirect]` */
function parseRequireLine(
	line: string,
): undefined | { indirect: boolean; module: string; version: string } {
	const indirect = isIndirect(line)
	const clean = stripComment(line)
	const match = MODULE_VERSION_REGEX.exec(clean)
	if (!match) {
		return undefined
	}

	const [, module, rawVersion] = match
	if (module === undefined || rawVersion === undefined) {
		return undefined
	}

	const version = rawVersion.replace(INCOMPATIBLE_SUFFIX_REGEX, '')
	return { indirect, module, version }
}

/**
 * Parse a replace-style line: `old [version] => new version` or `old [version]
 * => ./local`
 */
function parseReplaceLine(line: string): undefined | { from: string; to: Replacement } {
	const clean = stripComment(line)
	const parts = clean.split('=>')
	if (parts.length !== 2) {
		return undefined
	}

	const left = (parts[0] ?? '').trim().split(WHITESPACE_REGEX)
	const right = (parts[1] ?? '').trim().split(WHITESPACE_REGEX)

	const from = left[0]
	if (from === undefined || from === '' || right.length === 0) {
		return undefined
	}

	const target = right[0]
	if (target === undefined || target === '') {
		return undefined
	}

	if (target.startsWith('./') || target.startsWith('../') || target.startsWith('/')) {
		return { from, to: 'local' }
	}

	const version = right[1] ?? ''
	return { from, to: { module: target, version: version.replace(INCOMPATIBLE_SUFFIX_REGEX, '') } }
}

/** Parse a tool-style line: just a module path. */
function parseToolLine(line: string): string | undefined {
	const clean = stripComment(line).trim()
	if (clean.length === 0) {
		return undefined
	}

	const first = clean.split(WHITESPACE_REGEX)[0]
	return first === undefined || first === '' ? undefined : first
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a go.mod file and return structured metadata.
 *
 * Extracts module identity, Go version, direct dependencies (skipping indirect
 * ones), tool dependencies, and applies replace directives.
 */
export function parseGoMod(source: string): Record<string, unknown> {
	const data: {
		dependencies: Array<{ module: string; version: string }>
		go_version: string | undefined
		module: string | undefined
		repository_url: string | undefined
		tool_dependencies: string[]
	} = {
		dependencies: [],
		go_version: undefined,
		module: undefined,
		repository_url: undefined,
		tool_dependencies: [],
	}

	const directDependencies: Record<string, string> = {}
	const toolDependencies: string[] = []
	const replacements = new Map<string, Replacement>()

	let blockState: BlockState = 'none'

	function handleBlockLine(state: Exclude<BlockState, 'none'>, blockLine: string): void {
		switch (state) {
			case 'replace': {
				const rep = parseReplaceLine(blockLine)
				if (rep) {
					replacements.set(rep.from, rep.to)
				}

				break
			}

			case 'require': {
				const dependency = parseRequireLine(blockLine)
				if (dependency && !dependency.indirect) {
					directDependencies[dependency.module] = dependency.version
				}

				break
			}

			case 'skip': {
				break
			}

			case 'tool': {
				const tool = parseToolLine(blockLine)
				if (tool !== undefined && tool !== '') {
					toolDependencies.push(tool)
				}

				break
			}
		}
	}

	for (const rawLine of source.split('\n')) {
		const line = rawLine.trim()

		// Skip empty lines and pure comments outside blocks
		if (line === '' || (blockState === 'none' && line.startsWith('//'))) {
			continue
		}

		// Block close
		if (line === ')' || line.startsWith(')')) {
			blockState = 'none'
			continue
		}

		// Inside a block
		if (blockState !== 'none') {
			handleBlockLine(blockState, line)
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
				const dependency = parseRequireLine(line.slice('require '.length))
				if (dependency && !dependency.indirect) {
					directDependencies[dependency.module] = dependency.version
				}
			}
		} else if (line.startsWith('replace ')) {
			if (line.includes('(')) {
				blockState = 'replace'
			} else {
				const rep = parseReplaceLine(line.slice('replace '.length))
				if (rep) {
					replacements.set(rep.from, rep.to)
				}
			}
		} else if (line.startsWith('tool ')) {
			if (line.includes('(')) {
				blockState = 'tool'
			} else {
				const tool = parseToolLine(line.slice('tool '.length))
				if (tool !== undefined && tool !== '') {
					toolDependencies.push(tool)
				}
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
		if (!Object.hasOwn(directDependencies, from)) {
			continue
		}

		// eslint-disable-next-line ts/no-dynamic-delete
		delete directDependencies[from]
		if (to !== 'local') {
			directDependencies[to.module] = to.version
		}
	}

	// Convert deps map to array
	data.dependencies = Object.entries(directDependencies).map(([module, version]) => ({
		module,
		version,
	}))
	data.tool_dependencies = toolDependencies

	// Derive repository URL
	if (data.module !== undefined && data.module !== '') {
		data.repository_url = moduleToRepoUrl(data.module)
	}

	return data
}
