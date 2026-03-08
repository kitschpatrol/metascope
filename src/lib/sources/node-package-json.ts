import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { NodePackageJsonData } from '../parsers/node-package-json-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePackageJson } from '../parsers/node-package-json-parser'

export type { NodePackageJsonData } from '../parsers/node-package-json-parser'

/** Try to read package.json from a directory. */
async function readPackageJsonFile(directoryPath: string): Promise<string | undefined> {
	try {
		return await readFile(resolve(directoryPath, 'package.json'), 'utf8')
	} catch {
		return undefined
	}
}

export const nodePackageJsonSource: MetadataSource<'nodePackageJson'> = {
	async extract(context: SourceContext): Promise<NodePackageJsonData> {
		log.debug('Extracting package.json metadata...')
		const content = await readPackageJsonFile(context.path)
		if (!content) return {}
		return parsePackageJson(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readPackageJsonFile(context.path)
		return content !== undefined
	},
	key: 'nodePackageJson',
}
