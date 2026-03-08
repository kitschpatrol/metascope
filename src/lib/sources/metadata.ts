import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Metadata } from '../parsers/metadata-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseMetadata } from '../parsers/metadata-parser'

export type MetadataFileData = Partial<Metadata>

/** Supported metadata file names in priority order. */
const METADATA_FILES: ReadonlyArray<{ format: 'json' | 'yaml'; name: string }> = [
	{ format: 'json', name: 'metadata.json' },
	{ format: 'yaml', name: 'metadata.yaml' },
	{ format: 'yaml', name: 'metadata.yml' },
]

/**
 * Try to read and identify which metadata file exists in the directory.
 * Returns the content and format of the first found file, or undefined.
 */
async function findMetadataFile(
	directoryPath: string,
): Promise<undefined | { content: string; format: 'json' | 'yaml' }> {
	for (const { format, name } of METADATA_FILES) {
		try {
			const content = await readFile(resolve(directoryPath, name), 'utf8')
			return { content, format }
		} catch {
			// File doesn't exist, try next
		}
	}

	return undefined
}

export const metadataFileSource: MetadataSource<'metadataFile'> = {
	async extract(context: SourceContext): Promise<MetadataFileData> {
		log.debug('Extracting metadata file metadata...')

		const found = await findMetadataFile(context.path)
		if (!found) return {}

		return parseMetadata(found.content, found.format) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		return (await findMetadataFile(context.path)) !== undefined
	},
	key: 'metadataFile',
}
