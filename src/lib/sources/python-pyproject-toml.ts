/**
 * Source and parser for `pyproject.toml` files.
 *
 * Uses `read-pyproject` to parse and normalize pyproject.toml content.
 */

import type { PyprojectData } from 'read-pyproject'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePyproject } from 'read-pyproject'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { matchFiles } from './source'

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

export const pythonPyprojectTomlSource: MetadataSource<'pythonPyprojectToml'> = {
	async extract(context: SourceContext): Promise<PythonPyprojectTomlData> {
		const files = matchFiles(context.fileTree, ['**/pyproject.toml'])
		if (files.length === 0) return undefined

		log.debug('Extracting pyproject.toml metadata...')
		const results: Array<SourceRecord<PyprojectData>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				results.push({ data: parse(content), source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'pythonPyprojectToml',
	phase: 1,
}
