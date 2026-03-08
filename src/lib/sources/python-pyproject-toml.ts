import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PythonPyprojectTomlData } from '../parsers/python-pyproject-toml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePyprojectToml } from '../parsers/python-pyproject-toml-parser'

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

		const content = await readPyprojectFile(context.path)
		if (!content) return {}
		return parsePyprojectToml(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readPyprojectFile(context.path)
		return content !== undefined
	},
	key: 'pythonPyprojectToml',
}

export { type PythonPyprojectTomlData } from '../parsers/python-pyproject-toml-parser'
