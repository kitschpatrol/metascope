import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { GoMod } from '../parsers/go-mod-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseGoMod } from '../parsers/go-mod-parser'

export type GoModData = Partial<GoMod>

/** Find a `go.mod` file in a directory. */
async function findGoModFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const goMod = entries.find((entry) => entry === 'go.mod')
		if (goMod) return resolve(directoryPath, goMod)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const goModSource: MetadataSource<'goMod'> = {
	async extract(context: SourceContext): Promise<GoModData> {
		log.debug('Extracting go.mod metadata...')

		const filePath = await findGoModFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseGoMod(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findGoModFile(context.path)
		return filePath !== undefined
	},
	key: 'goMod',
}
