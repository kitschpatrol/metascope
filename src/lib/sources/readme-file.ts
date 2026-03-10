/**
 * Source and parser for README files.
 *
 * Extracts the first H1 heading from a markdown README as the project name.
 * Uses `unified` + `remark-parse` to build an mdast (Markdown Abstract Syntax
 * Tree) and walks it to find the first depth-1 heading.
 */

import type { Nodes, PhrasingContent } from 'mdast'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'

// ─── Schema ─────────────────────────────────────────────────────────

const readmeSchema = z.object({
	/** Project name extracted from the first H1 heading. */
	name: z.string(),
})

export type Readme = z.infer<typeof readmeSchema>

export type ReadmeFileData = OneOrMany<SourceRecord<Readme>> | undefined

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Recursively extract plain text from mdast phrasing content.
 */
function extractText(nodes: Nodes[] | PhrasingContent[]): string {
	return nodes
		.map((node) => {
			if ('value' in node) return node.value
			if ('children' in node) return extractText(node.children)
			return ''
		})
		.join('')
		.trim()
}

/**
 * Extract the text content of the first H1 heading from markdown.
 */
function extractFirstH1(markdown: string): string | undefined {
	const tree = unified().use(remarkParse).parse(markdown)

	for (const node of tree.children) {
		if (node.type === 'heading' && node.depth === 1) {
			const text = extractText(node.children)
			if (text.length > 0) {
				return text
			}
		}
	}

	return undefined
}

// ─── Parser ──────────────────────────────────────────────────────────

/** Pattern matching README filenames (case-insensitive, optional extension). */
export const readmePattern = /^readme(\.\w+)?$/i

/**
 * Parse a README file's content.
 * @param content - Raw file content (markdown).
 * @returns Parsed metadata, or `undefined` if no H1 heading is found.
 */
export function parse(content: string): Readme | undefined {
	const name = extractFirstH1(content)
	if (!name) return undefined
	return readmeSchema.parse({ name })
}

// ─── Source ──────────────────────────────────────────────────────────

export const readmeFileSource = defineSource<'readmeFile'>({
	async getInputs(context) {
		return getMatches(context.options, ['README', 'README.*'])
	},
	key: 'readmeFile',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const data = parse(content)
		if (data !== undefined) {
			return { data, source: input }
		}
	},
	phase: 1,
})
