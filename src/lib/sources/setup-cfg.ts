import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { SetupCfg } from '../parsers/setup-cfg-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseSetupCfg } from '../parsers/setup-cfg-parser'

export type SetupCfgData = Partial<SetupCfg>

/** Find a `setup.cfg` file in a directory. */
async function findSetupCfgFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const setupCfg = entries.find((entry) => entry === 'setup.cfg')
		if (setupCfg) return resolve(directoryPath, setupCfg)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const setupCfgSource: MetadataSource<'setupCfg'> = {
	async extract(context: SourceContext): Promise<SetupCfgData> {
		log.debug('Extracting setup.cfg metadata...')

		const filePath = await findSetupCfgFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseSetupCfg(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findSetupCfgFile(context.path)
		return filePath !== undefined
	},
	key: 'setupCfg',
}
