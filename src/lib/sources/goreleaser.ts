import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Goreleaser } from '../parsers/goreleaser-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseGoreleaser } from '../parsers/goreleaser-parser'

export type GoreleaserData = Partial<Goreleaser>

/** Goreleaser config filenames in priority order. */
const GORELEASER_FILENAMES = ['.goreleaser.yaml', '.goreleaser.yml']

/** Find a goreleaser config file in a directory. */
async function findGoreleaserFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		for (const filename of GORELEASER_FILENAMES) {
			if (entries.includes(filename)) return resolve(directoryPath, filename)
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const goreleaserSource: MetadataSource<'goreleaser'> = {
	async extract(context: SourceContext): Promise<GoreleaserData> {
		log.debug('Extracting goreleaser metadata...')

		const filePath = await findGoreleaserFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseGoreleaser(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findGoreleaserFile(context.path)
		return filePath !== undefined
	},
	key: 'goreleaser',
}
