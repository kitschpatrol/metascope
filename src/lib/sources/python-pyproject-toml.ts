/**
 * Source and parser for `pyproject.toml` files.
 *
 * Uses `read-pyproject` to parse and normalize pyproject.toml content.
 */

import type { PyprojectData } from 'read-pyproject'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePyproject } from 'read-pyproject'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'

export type PythonPyprojectTomlData = OneOrMany<SourceRecord<PyprojectData>> | undefined

/**
 * Parse pyproject.toml content and return structured metadata.
 */
export function parse(content: string): PyprojectData {
	return parsePyproject(content, {
		camelCase: true,
		unknownKeyPolicy: 'strip',
	})
}

export const pythonPyprojectTomlSource = defineSource<'pythonPyprojectToml'>({
	async discover(context) {
		return getMatches(context.options, ['pyproject.toml'])
	},
	key: 'pythonPyprojectToml',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: parse(content), source: input }
	},
	phase: 1,
})
