/**
 * Parser for README files.
 *
 * Extracts the first H1 heading from a markdown README as the project name.
 * Uses `unified` + `remark-parse` to build an mdast (Markdown Abstract Syntax
 * Tree) and walks it to find the first depth-1 heading.
 */

import type { Nodes, PhrasingContent } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

// ─── Types ──────────────────────────────────────────────────────────

/** Parsed README metadata. */
export type Readme = {
	/** Project name extracted from the first H1 heading. */
	name: string
}

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
export function parseReadme(content: string): Readme | undefined {
	const name = extractFirstH1(content)
	if (!name) return undefined
	return { name }
}
