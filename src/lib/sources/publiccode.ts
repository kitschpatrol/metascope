import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type {
	Publiccode,
	PubliccodeContactEntry,
	PubliccodeContractorEntry,
	PubliccodeDependencyEntry,
	PubliccodeDescription,
} from '../parsers/publiccode-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePubliccode } from '../parsers/publiccode-parser'

export type {
	PubliccodeContactEntry,
	PubliccodeContractorEntry,
	PubliccodeDependencyEntry,
	PubliccodeDescription,
}
export type PubliccodeData = Partial<Publiccode>

/** Try to read publiccode.yml or publiccode.yaml from a directory. */
async function readPubliccodeFile(dirPath: string): Promise<string | undefined> {
	for (const filename of ['publiccode.yml', 'publiccode.yaml']) {
		try {
			return await readFile(resolve(dirPath, filename), 'utf8')
		} catch {
			// Try next filename
		}
	}

	return undefined
}

export const publiccodeSource: MetadataSource<'publiccode'> = {
	async extract(context: SourceContext): Promise<PubliccodeData> {
		log.debug('Extracting publiccode metadata...')

		const content = await readPubliccodeFile(context.path)
		if (!content) return {}
		return parsePubliccode(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const content = await readPubliccodeFile(context.path)
		return content !== undefined
	},
	key: 'publiccode',
}
