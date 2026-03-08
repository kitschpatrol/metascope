/* eslint-disable ts/naming-convention */

import type { Node } from 'web-tree-sitter'
import { z } from 'zod'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'
import { getRubyLanguage, initParser } from '../utilities/tree-sitter-wasm.js'

// ─── Types ───────────────────────────────────────────────────────────────────

const gemSpecDependencySchema = z.object({
	name: z.string(),
	requirements: z.array(z.string()),
	type: z.enum(['development', 'runtime']),
})

/** @public */
const gemSpecSchema = z.object({
	authors: stringArray,
	bindir: nonEmptyString,
	cert_chain: stringArray,
	dependencies: z.array(gemSpecDependencySchema),
	description: nonEmptyString,
	email: z.union([z.string(), z.array(z.string())]).optional(),
	executables: stringArray,
	extensions: stringArray,
	/** Any attributes not explicitly modeled above */
	extra: z.record(z.string(), z.unknown()),
	extra_rdoc_files: stringArray,
	files: stringArray,
	homepage: optionalUrl,
	license: nonEmptyString,
	licenses: stringArray,
	metadata: z.record(z.string(), z.string()),
	name: nonEmptyString,
	platform: nonEmptyString,
	post_install_message: nonEmptyString,
	rdoc_options: stringArray,
	require_paths: stringArray,
	required_ruby_version: nonEmptyString,
	required_rubygems_version: nonEmptyString,
	signing_key: nonEmptyString,
	summary: nonEmptyString,
	test_files: stringArray,
	version: nonEmptyString,
})

export type GemSpec = z.infer<typeof gemSpecSchema>

type GemSpecDependency = GemSpec['dependencies'][number]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptySpec(): GemSpec {
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
	switch (node.type) {
		case 'call': {
			// Handle "value".freeze, "value".dup, -"value" (frozen string literal)
			const method = node.childForFieldName('method')
			if (method && IDENTITY_METHODS.has(method.text)) {
				const receiver = node.childForFieldName('receiver')
				if (receiver) return extractString(receiver)
			}
			return undefined
		}
		case 'float':
		case 'integer': {
			return node.text
		}
		case 'heredoc_body': {
			return node.text.trim()
		}
		case 'simple_symbol': {
			return node.text.replace(/^:/, '')
		}
		case 'string':
		case 'string_content': {
			// A string node wraps string_content children; grab all content fragments
			const parts = children(node).filter((c) => c.type === 'string_content')
			if (parts.length > 0) return parts.map((p) => p.text).join('')
			// Simple string with no interpolation
			return node.text.replaceAll(/^["']|["']$/g, '')
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
 * Attempt to extract a usable value from an arbitrary RHS node.
 * Returns string | string[] | null — we intentionally skip expressions
 * we can't statically evaluate (method calls, constants, etc.).
 */
function extractValue(node: Node): string | string[] | undefined {
	if (node.type === 'array' || node.type === 'string_array') {
		return extractStringArray(node)
	}
	// Handle [].freeze — unwrap identity methods on arrays
	if (node.type === 'call') {
		const method = node.childForFieldName('method')
		if (method && IDENTITY_METHODS.has(method.text)) {
			const receiver = node.childForFieldName('receiver')
			if (receiver) return extractValue(receiver)
		}
	}
	if (node.type === 'true') return 'true'
	if (node.type === 'false') return 'false'
	if (node.type === 'nil') return undefined
	return extractString(node)
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

const DEP_METHODS: Record<string, GemSpecDependency['type']> = {
	add_dependency: 'runtime',
	add_development_dependency: 'development',
	add_runtime_dependency: 'runtime',
}

function tryParseDependency(node: Node): GemSpecDependency | undefined {
	// We're looking for:  spec.add_dependency "name", "~> 1.0"
	if (node.type !== 'call' && node.type !== 'method_call') return undefined

	const methodNode = node.childForFieldName('method')
	if (!methodNode) return undefined

	// Method is itself a `call` node like `spec.add_dependency`
	let methodName: string | undefined
	if (methodNode.type === 'call') {
		const inner = methodNode.childForFieldName('method')
		methodName = inner?.text ?? undefined
	} else if (methodNode.type === 'identifier') {
		methodName = methodNode.text
	} else {
		// Sometimes the whole node is the call: `spec.add_dependency("name")`
		methodName = methodNode.text
	}

	// Check if this is a plain `call` with the dep method at the top level
	if (!methodName) {
		const topMethod = node.childForFieldName('method')
		if (topMethod?.type === 'identifier') methodName = topMethod.text
	}

	// For the pattern `s.add_dependency "name", "ver"` tree-sitter-ruby parses as:
	//   (call receiver: (identifier) method: (identifier) arguments: (argument_list ...))
	// but with a receiver like `spec`, it becomes:
	//   (call receiver: (call obj: spec method: add_dependency) arguments: ...)
	// We need to handle both.

	// Try extracting method name from the node text as fallback
	// eslint-disable-next-line ts/no-unnecessary-condition
	if (!methodName || !DEP_METHODS[methodName]) {
		// Check if the full text contains a dep method
		for (const m of Object.keys(DEP_METHODS)) {
			if (node.text.includes(`.${m}`)) {
				methodName = m
				break
			}
		}
	}

	// eslint-disable-next-line ts/no-unnecessary-condition
	if (!methodName || !DEP_METHODS[methodName]) return undefined

	const depType = DEP_METHODS[methodName]

	const arguments_ = node.childForFieldName('arguments')
	if (!arguments_) return undefined

	const argumentNodes = children(arguments_)
	if (argumentNodes.length === 0) return undefined

	const depName = extractString(argumentNodes[0])
	if (!depName) return undefined

	const requirements = argumentNodes
		.slice(1)
		.map((element) => extractString(element))
		.filter((s): s is string => s !== undefined)

	return { name: depName, requirements, type: depType }
}

// ─── Metadata hash extraction ────────────────────────────────────────────────

function extractHash(node: Node): Record<string, string> {
	const result: Record<string, string> = {}
	if (node.type !== 'hash') return result

	for (const pair of children(node)) {
		if (pair.type !== 'pair') continue
		const key = pair.childForFieldName('key')
		const value = pair.childForFieldName('value')
		if (!key || !value) continue
		const k = extractString(key)
		const v = extractString(value)
		if (k && v) result[k] = v
	}

	return result
}

function setStringAttribute(spec: GemSpec, key: string, value: string): void {
	Object.assign(spec, { [key]: value })
}

function setArrayAttribute(spec: GemSpec, key: string, value: string[]): void {
	Object.assign(spec, { [key]: value })
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a `.gemspec` file's contents and return a typed {@link GemSpec} object.
 *
 * Uses tree-sitter with the Ruby grammar to walk the AST, so it can handle
 * most real-world gemspec patterns without executing Ruby.
 *
 * Fields that reference Ruby constants (e.g. `Foo::VERSION`) or dynamic
 * expressions (e.g. `Dir.glob(...)`) will be `null` / empty — the parser
 * only extracts statically determinable values.
 */
export async function parseGemspec(source: string): Promise<GemSpec> {
	const parser = await initParser()
	const ruby = await getRubyLanguage()
	parser.setLanguage(ruby)

	const tree = parser.parse(source)
	if (!tree) throw new Error('Failed to parse gemspec source')
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
			if (!attribute) {
				visitChildren(node)
				return
			}

			// Email can be string or array
			if (attribute === 'email') {
				const value = extractValue(rhs)
				if (value !== undefined) spec.email = value
				return
			}

			// Metadata is a hash
			if (attribute === 'metadata') {
				if (rhs.type === 'hash') {
					spec.metadata = { ...spec.metadata, ...extractHash(rhs) }
				}
				return
			}

			// String attributes
			if (STRING_ATTRS.has(attribute)) {
				const value = extractString(rhs)
				if (value !== undefined) setStringAttribute(spec, attribute, value)
				return
			}

			// Array attributes
			if (ARRAY_ATTRS.has(attribute)) {
				const array = extractStringArray(rhs)
				if (array.length > 0) setArrayAttribute(spec, attribute, array)
				return
			}

			// Anything else → stash in extra
			const value = extractValue(rhs)
			if (value !== undefined) spec.extra[attribute] = value
			return
		}

		// ── Method calls: spec.add_dependency / metadata[]= ───────────────
		if (node.type === 'call' || node.type === 'method_call') {
			const dep = tryParseDependency(node)
			if (dep) {
				spec.dependencies.push(dep)
				return
			}
		}

		// ── Element assignment: spec.metadata["key"] = "value" ────────────
		if (node.type === 'element_assignment' || node.type === 'indexing') {
			// We handle this pattern at the assignment level, so fall through
		}

		visitChildren(node)
	}

	function visitChildren(node: Node): void {
		for (const child of children(node)) {
			visit(child)
		}
	}

	visit(tree.rootNode)
	return gemSpecSchema.parse(spec)
}
