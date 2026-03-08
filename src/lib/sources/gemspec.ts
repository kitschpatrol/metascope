import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { GemSpec, GemSpecDependency } from '../parsers/gemspec-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseGemspec } from '../parsers/gemspec-parser'

export type { GemSpecDependency }
export type GemspecData = Partial<GemSpec>

/** Find the first `*.gemspec` file in a directory. */
async function findGemspecFile(dirPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(dirPath)
		const gemspec = entries.find((entry) => entry.endsWith('.gemspec'))
		if (gemspec) return resolve(dirPath, gemspec)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const gemspecSource: MetadataSource<'gemspec'> = {
	async extract(context: SourceContext): Promise<GemspecData> {
		log.debug('Extracting gemspec metadata...')

		const filePath = await findGemspecFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parseGemspec(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findGemspecFile(context.path)
		return filePath !== undefined
	},
	key: 'gemspec',
}
