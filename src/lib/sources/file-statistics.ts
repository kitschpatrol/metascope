import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
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

		const { fileTree } = context
		const totalFileCount = fileTree.length

		const uniqueDirectories = new Set<string>()
		for (const file of fileTree) {
			const directory = dirname(file)
			if (directory !== '.') {
				uniqueDirectories.add(directory)
			}
		}

		const totalDirectoryCount = uniqueDirectories.size

		const sizes = await Promise.all(
			fileTree.map(async (file) => {
				try {
					const fileStat = await stat(resolve(context.options.path, file))
					return fileStat.size
				} catch {
					return 0
				}
			}),
		)

		const totalSizeBytes = sizes.reduce((sum, size) => sum + size, 0)

		return {
			data: {
				totalDirectoryCount,
				totalFileCount,
				totalSizeBytes,
			},
			source: context.options.path,
		}
	},
	key: 'fileStatistics',
	phase: 2,
}
