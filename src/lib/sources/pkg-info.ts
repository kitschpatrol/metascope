import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PkgInfo } from '../parsers/pkg-info-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePkgInfo } from '../parsers/pkg-info-parser'

export type PkgInfoData = Partial<PkgInfo>

/** Find a `PKG-INFO` file in a directory. */
async function findPkgInfoFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const pkgInfo = entries.find((entry) => entry === 'PKG-INFO')
		if (pkgInfo) return resolve(directoryPath, pkgInfo)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const pkgInfoSource: MetadataSource<'pkgInfo'> = {
	async extract(context: SourceContext): Promise<PkgInfoData> {
		log.debug('Extracting PKG-INFO metadata...')

		const filePath = await findPkgInfoFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parsePkgInfo(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findPkgInfoFile(context.path)
		return filePath !== undefined
	},
	key: 'pkgInfo',
}
