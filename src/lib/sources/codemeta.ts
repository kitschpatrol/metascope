import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CodeMetaJsonData } from '../parsers/codemeta-json-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseCodemetaJson } from '../parsers/codemeta-json-parser'

export type CodeMetaData = CodeMetaJsonData

/** Try to read codemeta.json from a directory. */
async function readCodemetaJsonFile(directoryPath: string): Promise<string | undefined> {
	try {
		return await readFile(resolve(directoryPath, 'codemeta.json'), 'utf8')
	} catch {
		return undefined
	}
}

export const codemetaSource: MetadataSource<'codemeta'> = {
	async extract(context: SourceContext): Promise<CodeMetaData> {
		log.debug('Extracting codemeta.json metadata...')
		const content = await readCodemetaJsonFile(context.path)
		if (!content) return {}
		return parseCodemetaJson(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readCodemetaJsonFile(context.path)
		return content !== undefined
	},
	key: 'codemeta',
}
