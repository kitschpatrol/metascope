import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Readme } from '../parsers/readme-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseReadme, readmePattern } from '../parsers/readme-parser'

export type ReadmeData = Partial<Readme>

/** Find the first README file in a directory. */
async function findReadmeFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const readmeFile = entries.find((name) => readmePattern.test(name))
		return readmeFile ? resolve(directoryPath, readmeFile) : undefined
	} catch {
		return undefined
	}
}

export const readmeSource: MetadataSource<'readme'> = {
	async extract(context: SourceContext): Promise<ReadmeData> {
		log.debug('Extracting README metadata...')

		const filePath = await findReadmeFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseReadme(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findReadmeFile(context.path)
		return filePath !== undefined
	},
	key: 'readme',
}
