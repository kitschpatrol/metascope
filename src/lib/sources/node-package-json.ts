/**
 * Source and parser for `package.json` files.
 *
 * Uses `read-pkg` to parse and normalize package.json content.
 */

// eslint-disable-next-line depend/ban-dependencies
import type { NormalizedPackageJson } from 'read-pkg'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
// eslint-disable-next-line depend/ban-dependencies
import { parsePackage } from 'read-pkg'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type NodePackageJsonData = Partial<NormalizedPackageJson>

/**
 * Parse package.json content and return structured metadata.
 */
export function parse(content: string): NormalizedPackageJson {
	return parsePackage(content)
}

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
		return parse(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readPackageJsonFile(context.path)
		return content !== undefined
	},
	key: 'nodePackageJson',
}
