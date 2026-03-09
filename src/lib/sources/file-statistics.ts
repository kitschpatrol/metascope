import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { SourceRecord } from './source'
import { log } from '../log'
import { defineSource, getMatches } from './source'

export type FileStatistics = {
	/** Total number of directories (recursive). */
	totalDirectoryCount?: number
	/** Total number of files (recursive). */
	totalFileCount?: number
	/** Total size of all files in bytes. */
	totalSizeBytes?: number
}

export type FileStatisticsData = SourceRecord<FileStatistics> | undefined

export const fileStatisticsSource = defineSource<'fileStatistics'>({
	// eslint-disable-next-line ts/require-await
	async getInputs(context) {
		return [context.options.path]
	},
	key: 'fileStatistics',
	async parseInput(_input, context) {
		log.debug('Extracting file statistics metadata...')

		const allFiles = await getMatches(
			{ ...context.options, recursive: true },
			['**'],
			{ rawPatterns: true },
		)
		const totalFileCount = allFiles.length

		const uniqueDirectories = new Set<string>()
		for (const file of allFiles) {
			const directory = dirname(file)
			if (directory !== '.') {
				uniqueDirectories.add(directory)
			}
		}

		const totalDirectoryCount = uniqueDirectories.size

		const sizes = await Promise.all(
			allFiles.map(async (file) => {
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
	phase: 2,
})
