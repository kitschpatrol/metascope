import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type FilesystemData = {
	/** Total number of directories (recursive). */
	totalDirectoryCount?: number
	/** Total number of files (recursive). */
	totalFileCount?: number
	/** Total size of all files in bytes. */
	totalSizeBytes?: number
}

export const filesystemSource: MetadataSource<'filesystem'> = {
	async extract(context: SourceContext): Promise<FilesystemData> {
		log.debug('Extracting filesystem metadata...')

		const entries = await readdir(context.path, { recursive: true, withFileTypes: true })

		const files = entries.filter((entry) => entry.isFile())
		const directories = entries.filter((entry) => entry.isDirectory())

		const sizes = await Promise.all(
			files.map(async (entry) => {
				try {
					const filePath = join(entry.parentPath, entry.name)
					const fileStat = await stat(filePath)
					return fileStat.size
				} catch {
					return 0
				}
			}),
		)

		const totalSizeBytes = sizes.reduce((sum, size) => sum + size, 0)

		return {
			totalDirectoryCount: directories.length,
			totalFileCount: files.length,
			totalSizeBytes,
		}
	},
	// eslint-disable-next-line ts/require-await
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'filesystem',
}
