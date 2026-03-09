/**
 * Source and parser for `pyproject.toml` files.
 *
 * Uses `read-pyproject` to parse and normalize pyproject.toml content.
 */

import type { PyprojectData } from 'read-pyproject'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePyproject } from 'read-pyproject'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

export type PythonPyprojectTomlData = SourceRecord<PyprojectData> | undefined

/**
 * Parse pyproject.toml content and return structured metadata.
 */
export function parse(content: string): PyprojectData {
	return parsePyproject(content, {
		camelCase: true,
		unknownKeyPolicy: 'strip',
	})
}

/** Try to read pyproject.toml from a directory. */
async function readPyprojectFile(directoryPath: string): Promise<string | undefined> {
	try {
		return await readFile(resolve(directoryPath, 'pyproject.toml'), 'utf8')
	} catch {
		return undefined
	}
}

export const pythonPyprojectTomlSource: MetadataSource<'pythonPyprojectToml'> = {
	async extract(context: SourceContext): Promise<PythonPyprojectTomlData> {
		log.debug('Extracting pyproject.toml metadata...')

		const filePath = resolve(context.path, 'pyproject.toml')
		const content = await readPyprojectFile(context.path)
		if (!content) return undefined
		const data = parse(content)
		return { data, source: filePath }
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readPyprojectFile(context.path)
		return content !== undefined
	},
	key: 'pythonPyprojectToml',
}
