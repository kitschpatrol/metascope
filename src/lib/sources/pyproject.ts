import type { PyprojectData as ReadPyprojectData } from 'read-pyproject'
import { getChildLogger } from 'lognow'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readPyproject, setLogger } from 'read-pyproject'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

setLogger(getChildLogger(log, 'read-pyproject'))

export type PyprojectData = ReadPyprojectData

export const pyprojectSource: MetadataSource<'pyproject'> = {
	async extract(context: SourceContext): Promise<PyprojectData> {
		log.debug('Extracting pyproject.toml metadata...')
		return readPyproject(context.path, {
			camelCase: true,
			unknownKeyPolicy: 'strip',
		})
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(resolve(context.path, 'pyproject.toml'))
			return true
		} catch {
			return false
		}
	},
	key: 'pyproject',
}
