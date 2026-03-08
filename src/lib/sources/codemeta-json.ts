import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CodeMetaDependency, CodeMetaJsonData, CodeMetaPersonOrOrg } from '../parsers/codemeta-json-parser'
import { parseCodemetaJson } from '../parsers/codemeta-json-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type { CodeMetaDependency, CodeMetaJsonData, CodeMetaPersonOrOrg }

/** Try to read codemeta.json from a directory. */
async function readCodemetaJsonFile(directoryPath: string): Promise<string | undefined> {
	try {
		return await readFile(resolve(directoryPath, 'codemeta.json'), 'utf8')
	} catch {
		return undefined
	}
}

export const codemetaJsonSource: MetadataSource<'codemetaJson'> = {
	async extract(context: SourceContext): Promise<CodeMetaJsonData> {
		log.debug('Extracting codemeta.json metadata...')
		const content = await readCodemetaJsonFile(context.path)
		if (!content) return {}
		return parseCodemetaJson(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readCodemetaJsonFile(context.path)
		return content !== undefined
	},
	key: 'codemetaJson',
}
