/* eslint-disable ts/naming-convention */
/* eslint-disable ts/no-unsafe-member-access */
/* eslint-disable ts/no-explicit-any */
/* eslint-disable ts/no-unsafe-type-assertion */

import type { Node } from 'web-tree-sitter'
import { z } from 'zod'
import { getPythonLanguage, initParser } from '../utilities/tree-sitter-wasm.js'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed setup.py metadata */
const setupPyDataSchema = z.object({
	author: nonEmptyString,
	author_email: nonEmptyString,
	classifiers: stringArray,
	description: nonEmptyString,
	download_url: optionalUrl,
	extras_require: z.record(z.string(), z.array(z.string())),
	install_requires: stringArray,
	keywords: z.array(z.string()).optional(),
	license: nonEmptyString,
	long_description: nonEmptyString,
	maintainer: nonEmptyString,
	maintainer_email: nonEmptyString,
	name: nonEmptyString,
	project_urls: z.record(z.string(), z.string()),
	python_requires: nonEmptyString,
	url: optionalUrl,
	version: nonEmptyString,
})

export type SetupPyData = z.infer<typeof setupPyDataSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Filter nulls from web-tree-sitter's `namedChildren` array. */
function children(node: Node): Node[] {
	// eslint-disable-next-line ts/no-unnecessary-condition
	return node.namedChildren.filter((c): c is Node => c !== null)
}

function emptySetupPyData(): SetupPyData {
	return {
		author: undefined,
		author_email: undefined,
		classifiers: [],
		description: undefined,
		download_url: undefined,
		extras_require: {},
		install_requires: [],
		keywords: undefined,
		license: undefined,
		long_description: undefined,
		maintainer: undefined,
		maintainer_email: undefined,
		name: undefined,
		project_urls: {},
		python_requires: undefined,
		url: undefined,
		version: undefined,
	}
}

/** Extract a string literal value from a tree-sitter node. */
function extractString(node: Node): string | undefined {
	switch (node.type) {
		case 'concatenated_string': {
			// "hello" "world" → "helloworld"
			const parts = children(node)
				.map((child) => extractString(child))
				.filter((s): s is string => s !== undefined)
			return parts.length > 0 ? parts.join('') : undefined
		}
		case 'float':
		case 'integer': {
			return node.text
		}
		case 'string': {
			// Python strings: 'value', "value", '''value''', """value"""
			// Only match string_content — string_start/string_end are just quote chars
			const content = children(node).find((c) => c.type === 'string_content')
			if (content) return content.text
			// Fallback: strip quotes manually (b/f/r/u are Python string prefixes)
			const raw = node.text
			// eslint-disable-next-line capitalized-comments
			const withoutPrefix = raw.replace(/^[bfru]*/i, '') // cspell:disable-line
			if (withoutPrefix.startsWith('"""') || withoutPrefix.startsWith("'''")) {
				return withoutPrefix.slice(3, -3)
			}
			return withoutPrefix.slice(1, -1)
		}
		case 'string_content': {
			return node.text
		}
		default: {
			return undefined
		}
	}
}

/** Extract a list of strings from an array/list literal node. */
function extractStringList(node: Node): string[] {
	if (node.type === 'list') {
		return children(node)
			.map((child) => extractString(child))
			.filter((s): s is string => s !== undefined)
	}

	// Tuple
	if (node.type === 'tuple') {
		return children(node)
			.map((child) => extractString(child))
			.filter((s): s is string => s !== undefined)
	}

	// Single value
	const single = extractString(node)
	return single === undefined ? [] : [single]
}

/** Extract a dict literal into a Record<string, string>. */
function extractStringDict(node: Node): Record<string, string> {
	const result: Record<string, string> = {}
	if (node.type !== 'dictionary') return result

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

/** Extract a dict of string lists (for extras_require). */
function extractStringListDict(node: Node): Record<string, string[]> {
	const result: Record<string, string[]> = {}
	if (node.type !== 'dictionary') return result

	for (const pair of children(node)) {
		if (pair.type !== 'pair') continue
		const key = pair.childForFieldName('key')
		const value = pair.childForFieldName('value')
		if (!key || !value) continue
		const k = extractString(key)
		if (k) result[k] = extractStringList(value)
	}

	return result
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/** Simple string attributes to extract from setup() keyword arguments. */
const STRING_ATTRS = new Set<keyof SetupPyData>([
	'author',
	'author_email',
	'description',
	'download_url',
	'license',
	'long_description',
	'maintainer',
	'maintainer_email',
	'name',
	'python_requires',
	'url',
	'version',
])

/**
 * Parse a setup.py file and return structured metadata.
 *
 * Uses tree-sitter with the Python grammar to find the `setup()` call
 * and extract keyword arguments. Only statically determinable values
 * (string/list literals) are extracted — variables and dynamic expressions
 * are skipped.
 */
export async function parseSetupPy(source: string): Promise<SetupPyData> {
	const parser = await initParser()
	const python = await getPythonLanguage()
	parser.setLanguage(python)

	const tree = parser.parse(source)
	if (!tree) throw new Error('Failed to parse setup.py source')
	const data = emptySetupPyData()

	// Find the setup() call in the AST
	const setupCall = findSetupCall(tree.rootNode)
	if (!setupCall) return data

	// Extract keyword arguments from the setup() call
	const argumentChildren = setupCall.childForFieldName('arguments')
	if (!argumentChildren) return data

	for (const child of children(argumentChildren)) {
		if (child.type !== 'keyword_argument') continue

		const nameNode = child.childForFieldName('name')
		const valueNode = child.childForFieldName('value')
		if (!nameNode || !valueNode) continue

		const argumentName = nameNode.text

		// String attributes
		if (STRING_ATTRS.has(argumentName as keyof SetupPyData)) {
			const value = extractString(valueNode)
			if (value !== undefined) {
				;(data as any)[argumentName] = value
			}

			continue
		}

		// List attributes
		switch (argumentName) {
			case 'classifiers': {
				data.classifiers = extractStringList(valueNode)
				break
			}
			case 'extras_require': {
				data.extras_require = extractStringListDict(valueNode)
				break
			}
			case 'install_requires': {
				data.install_requires = extractStringList(valueNode)
				break
			}
			case 'keywords': {
				// Keywords can be a list or a comma-separated string
				if (valueNode.type === 'list' || valueNode.type === 'tuple') {
					data.keywords = extractStringList(valueNode)
				} else {
					const string_ = extractString(valueNode)
					if (string_) {
						data.keywords = string_.split(',').map((k) => k.trim())
					}
				}

				break
			}
			case 'project_urls': {
				data.project_urls = extractStringDict(valueNode)
				break
			}
			// No default
		}
	}

	return setupPyDataSchema.parse(data)
}

/**
 * Recursively find the setup() or setuptools.setup() call in the AST.
 */
function findSetupCall(node: Node): Node | undefined {
	if (node.type === 'call') {
		const function_ = node.childForFieldName('function')
		if (function_) {
			// Direct call: setup(...)
			if (function_.type === 'identifier' && function_.text === 'setup') {
				return node
			}

			// Attribute access: setuptools.setup(...)
			if (function_.type === 'attribute') {
				const attribute = function_.childForFieldName('attribute')
				if (attribute?.text === 'setup') {
					return node
				}
			}
		}
	}

	for (const child of children(node)) {
		const result = findSetupCall(child)
		if (result) return result
	}

	return undefined
}
