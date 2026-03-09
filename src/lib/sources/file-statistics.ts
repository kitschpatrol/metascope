import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

export type FileStatistics = {
	/** Total number of directories (recursive). */
	totalDirectoryCount?: number
	/** Total number of files (recursive). */
	totalFileCount?: number
	/** Total size of all files in bytes. */
	totalSizeBytes?: number
}

export type FileStatisticsData = SourceRecord<FileStatistics> | undefined

export const fileStatisticsSource: MetadataSource<'fileStatistics'> = {
	async extract(context: SourceContext): Promise<FileStatisticsData> {
		log.debug('Extracting file statistics metadata...')

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
			data: {
				totalDirectoryCount: directories.length,
				totalFileCount: files.length,
				totalSizeBytes,
			},
			source: context.path,
		}
	},
	key: 'fileStatistics',
	phase: 2,}
