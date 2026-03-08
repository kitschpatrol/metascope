import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { SetupPyData } from '../parsers/python-setup-py-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseSetupPy } from '../parsers/python-setup-py-parser'

export type PythonSetupPyData = Partial<SetupPyData>

/** Find the first `setup.py` file in a directory. */
async function findSetupPyFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const setupPy = entries.find((entry) => entry === 'setup.py')
		if (setupPy) return resolve(directoryPath, setupPy)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const pythonSetupPySource: MetadataSource<'pythonSetupPy'> = {
	async extract(context: SourceContext): Promise<PythonSetupPyData> {
		log.debug('Extracting Python setup.py metadata...')

		const filePath = await findSetupPyFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseSetupPy(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findSetupPyFile(context.path)
		return filePath !== undefined
	},
	key: 'pythonSetupPy',
}
