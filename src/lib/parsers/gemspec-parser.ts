/* eslint-disable complexity */
/* eslint-disable ts/naming-convention */

import type { Node } from 'web-tree-sitter'
import is from '@sindresorhus/is'
import { getRubyLanguage, initParser } from '../utilities/tree-sitter-wasm.js'

const LEADING_COLON_REGEX = /^:/v

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptySpec(): Record<string, unknown> {
	return {
		authors: [],
		bindir: undefined,
		cert_chain: [],
		dependencies: [],
		description: undefined,
		email: undefined,
		executables: [],
		extensions: [],
		extra: {},
		extra_rdoc_files: [],
		files: [],
		homepage: undefined,
		license: undefined,
		licenses: [],
		metadata: {},
		name: undefined,
		platform: undefined,
		post_install_message: undefined,
		rdoc_options: [],
		require_paths: [],
		required_ruby_version: undefined,
		required_rubygems_version: undefined,
		signing_key: undefined,
		summary: undefined,
		test_files: [],
		version: undefined,
	}
}

/** Filter nulls from web-tree-sitter's `namedChildren` array. */
function children(node: Node): Node[] {
	// eslint-disable-next-line ts/no-unnecessary-condition
	return node.namedChildren.filter((c): c is Node => c !== null)
}

/** Methods that return the receiver unchanged — safe to unwrap. */
const IDENTITY_METHODS = new Set(['-@', 'dup', 'freeze'])

/** Extract the raw string value from a tree-sitter string/symbol node. */
function extractString(node: Node): string | undefined {
	// Unwrap identity-method calls: "value".freeze, "value".dup, -"value"
	let current = node
	while (current.type === 'call') {
		const method = current.childForFieldName('method')
		const receiver =
			method && IDENTITY_METHODS.has(method.text)
				? current.childForFieldName('receiver')
				: undefined
		if (!receiver) {
			return undefined
		}

		current = receiver
	}

	switch (current.type) {
		case 'float':
		case 'integer': {
			return current.text
		}

		case 'heredoc_body': {
			return current.text.trim()
		}

		case 'simple_symbol': {
			return current.text.replace(LEADING_COLON_REGEX, '')
		}

		case 'string':
		case 'string_content': {
			// A string node wraps string_content children; grab all content fragments
			const parts = children(current).filter((c) => c.type === 'string_content')
			if (parts.length > 0) {
				return parts.map((p) => p.text).join('')
			}

			// Simple string with no interpolation
			return current.text.replaceAll(/^["']|["']$/gv, '')
		}

		default: {
			return undefined
		}
	}
}

/** Extract a string array from an array node like `["a", "b"]`. */
function extractStringArray(node: Node): string[] {
	if (node.type === 'array') {
		return children(node)
			.map((element) => extractString(element))
			.filter((s): s is string => s !== undefined)
	}

	// %w[] word arrays appear as string_array
	if (node.type === 'string_array') {
		return children(node).map((c) => (c.type === 'bare_string' ? c.text : c.text))
	}

	// Single value → wrap in array
	const single = extractString(node)
	return single === undefined ? [] : [single]
}

/**
 * Attempt to extract a usable value from an arbitrary RHS node. Returns string
 *
 * | string[] | null — we intentionally skip expressions we can't statically
 *
 * Evaluate (method calls, constants, etc.).
 */
function extractValue(node: Node): string | string[] | undefined {
	// Handle [].freeze — unwrap identity methods (on arrays and other values)
	let current = node
	while (current.type === 'call') {
		const method = current.childForFieldName('method')
		const receiver =
			method && IDENTITY_METHODS.has(method.text)
				? current.childForFieldName('receiver')
				: undefined
		if (!receiver) {
			break
		}

		current = receiver
	}

	if (current.type === 'array' || current.type === 'string_array') {
		return extractStringArray(current)
	}

	if (current.type === 'true') {
		return 'true'
	}

	if (current.type === 'false') {
		return 'false'
	}

	if (current.type === 'nil') {
		return undefined
	}

	return extractString(current)
}

/** Resolve the attribute name from the LHS of `spec.foo = ...` */
function resolveAttribute(node: Node): string | undefined {
	// Node is a `call` like `spec.name`  or a  `method_call`
	if (node.type === 'call') {
		const methodNode = node.childForFieldName('method')
		return methodNode?.text ?? undefined
	}

	return undefined
}

// ─── Dependency helpers ──────────────────────────────────────────────────────

const DEP_METHODS: Record<string, 'development' | 'runtime'> = {
	add_dependency: 'runtime',
	add_development_dependency: 'development',
	add_runtime_dependency: 'runtime',
}

function tryParseDependency(
	node: Node,
): undefined | { name: string; requirements: string[]; type: 'development' | 'runtime' } {
	// We're looking for:  spec.add_dependency "name", "~> 1.0"
	if (node.type !== 'call' && node.type !== 'method_call') {
		return undefined
	}

	const methodNode = node.childForFieldName('method')
	if (!methodNode) {
		return undefined
	}

	// Method is itself a `call` node like `spec.add_dependency`
	let methodName: string | undefined
	if (methodNode.type === 'call') {
		const inner = methodNode.childForFieldName('method')
		methodName = inner?.text ?? undefined
	} else {
		// A plain identifier, or the whole node is the call: `spec.add_dependency("name")`
		methodName = methodNode.text
	}

	// Check if this is a plain `call` with the dep method at the top level
	if (methodName === undefined || methodName === '') {
		const topMethod = node.childForFieldName('method')
		if (topMethod?.type === 'identifier') {
			methodName = topMethod.text
		}
	}

	// For the pattern `s.add_dependency "name", "ver"` tree-sitter-ruby parses as:
	//   (call receiver: (identifier) method: (identifier) arguments: (argument_list ...))
	// but with a receiver like `spec`, it becomes:
	//   (call receiver: (call obj: spec method: add_dependency) arguments: ...)
	// We need to handle both.

	// Try extracting method name from the node text as fallback

	if (methodName === undefined || methodName === '' || DEP_METHODS[methodName] === undefined) {
		// Check if the full text contains a dep method
		for (const m of Object.keys(DEP_METHODS)) {
			if (node.text.includes(`.${m}`)) {
				methodName = m
				break
			}
		}
	}

	if (methodName === undefined || methodName === '') {
		return undefined
	}

	const dependencyType = DEP_METHODS[methodName]
	if (dependencyType === undefined) {
		return undefined
	}

	const arguments_ = node.childForFieldName('arguments')
	if (!arguments_) {
		return undefined
	}

	const argumentNodes = children(arguments_)
	const firstArgument = argumentNodes[0]
	if (firstArgument === undefined) {
		return undefined
	}

	const dependencyName = extractString(firstArgument)
	if (dependencyName === undefined || dependencyName === '') {
		return undefined
	}

	const requirements = argumentNodes
		.slice(1)
		.map((element) => extractString(element))
		.filter((s): s is string => s !== undefined)

	return { name: dependencyName, requirements, type: dependencyType }
}

// ─── Metadata hash extraction ────────────────────────────────────────────────

function extractHash(node: Node): Record<string, string> {
	const result: Record<string, string> = {}
	if (node.type !== 'hash') {
		return result
	}

	for (const pair of children(node)) {
		if (pair.type !== 'pair') {
			continue
		}

		const key = pair.childForFieldName('key')
		const value = pair.childForFieldName('value')
		if (!key || !value) {
			continue
		}

		const k = extractString(key)
		const v = extractString(value)
		if (k !== undefined && k !== '' && v !== undefined && v !== '') {
			result[k] = v
		}
	}

	return result
}

function setStringAttribute(spec: Record<string, unknown>, key: string, value: string): void {
	Object.assign(spec, { [key]: value })
}

function setArrayAttribute(spec: Record<string, unknown>, key: string, value: string[]): void {
	Object.assign(spec, { [key]: value })
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a `.gemspec` file's contents and return a plain object with the
 * extracted fields.
 *
 * Uses tree-sitter with the Ruby grammar to walk the AST, so it can handle most
 * real-world gemspec patterns without executing Ruby.
 *
 * Fields that reference Ruby constants (e.g. `Foo::VERSION`) or dynamic
 * expressions (e.g. `Dir.glob(...)`) will be `null` / empty — the parser only
 * extracts statically determinable values.
 */
export async function parseGemspec(source: string): Promise<Record<string, unknown>> {
	const parser = await initParser()
	const ruby = await getRubyLanguage()
	parser.setLanguage(ruby)

	const tree = parser.parse(source)
	if (!tree) {
		throw new Error('Failed to parse gemspec source')
	}

	const spec = emptySpec()

	/** Map of simple attribute names → setter logic */
	const STRING_ATTRS = new Set<string>([
		'bindir',
		'description',
		'homepage',
		'license',
		'name',
		'platform',
		'post_install_message',
		'required_ruby_version',
		'required_rubygems_version',
		'signing_key',
		'summary',
		'version',
	])

	const ARRAY_ATTRS = new Set<string>([
		'authors',
		'cert_chain',
		'executables',
		'extensions',
		'extra_rdoc_files',
		'files',
		'licenses',
		'rdoc_options',
		'require_paths',
		'test_files',
	])

	function visit(node: Node): void {
		// ── Assignment: spec.attr = value ──────────────────────────────────
		if (node.type === 'assignment') {
			const lhs = node.childForFieldName('left')
			const rhs = node.childForFieldName('right')
			if (!lhs || !rhs) {
				visitChildren(node)
				return
			}

			const attribute = resolveAttribute(lhs)
			if (attribute === undefined || attribute === '') {
				visitChildren(node)
				return
			}

			// Email can be string or array
			if (attribute === 'email') {
				const value = extractValue(rhs)
				if (value !== undefined) {
					spec.email = value
				}

				return
			}

			// Metadata is a hash
			if (attribute === 'metadata') {
				if (rhs.type === 'hash') {
					const existing = is.plainObject(spec.metadata) ? spec.metadata : {}
					spec.metadata = { ...existing, ...extractHash(rhs) }
				}

				return
			}

			// String attributes
			if (STRING_ATTRS.has(attribute)) {
				const value = extractString(rhs)
				if (value !== undefined) {
					setStringAttribute(spec, attribute, value)
				}

				return
			}

			// Array attributes
			if (ARRAY_ATTRS.has(attribute)) {
				const array = extractStringArray(rhs)
				if (array.length > 0) {
					setArrayAttribute(spec, attribute, array)
				}

				return
			}

			// Anything else → stash in extra
			const value = extractValue(rhs)
			if (value !== undefined && is.plainObject(spec.extra)) {
				spec.extra[attribute] = value
			}

			return
		}

		// ── Method calls: spec.add_dependency / metadata[]= ───────────────
		if (node.type === 'call' || node.type === 'method_call') {
			const dependency = tryParseDependency(node)
			if (dependency) {
				if (Array.isArray(spec.dependencies)) {
					spec.dependencies.push(dependency)
				}

				return
			}
		}

		// Element assignments (spec.metadata["key"] = "value") are handled at the
		// assignment level, so just recurse into children here.
		visitChildren(node)
	}

	function visitChildren(node: Node): void {
		for (const child of children(node)) {
			visit(child)
		}
	}

	visit(tree.rootNode)
	return spec
}
