import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Pbxproj } from '../parsers/pbxproj-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePbxproj } from '../parsers/pbxproj-parser'

export type PbxprojData = Partial<Pbxproj>

/**
 * Find the first `*.xcodeproj/project.pbxproj` file in a directory.
 * Returns the full path or undefined if not found.
 */
async function findPbxprojFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isDirectory() && entry.name.endsWith('.xcodeproj')) {
				const pbxprojPath = resolve(directoryPath, entry.name, 'project.pbxproj')
				try {
					await stat(pbxprojPath)
					return pbxprojPath
				} catch {
					// Project.pbxproj doesn't exist inside this .xcodeproj
				}
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const pbxprojSource: MetadataSource<'pbxproj'> = {
	async extract(context: SourceContext): Promise<PbxprojData> {
		log.debug('Extracting pbxproj metadata...')

		const filePath = await findPbxprojFile(context.path)
		if (!filePath) return {}

		return parsePbxproj(filePath) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findPbxprojFile(context.path)
		return filePath !== undefined
	},
	key: 'pbxproj',
}
