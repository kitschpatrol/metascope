import { stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches, getWorkspaces } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'

export type FileStatistics = {
	/** Total number of directories (recursive). */
	totalDirectoryCount?: number
	/** Total number of files (recursive). */
	totalFileCount?: number
	/** Total size of all files in bytes. */
	totalSizeBytes?: number
}

export type FileStatisticsData = OneOrMany<SourceRecord<FileStatistics>> | undefined

export const fileStatisticsSource = defineSource<'fileStatistics'>({
	// eslint-disable-next-line ts/require-await
	async getInputs(context) {
		return [
			context.options.path,
			...getWorkspaces(context.options.path, context.options.workspaces),
		]
	},
	key: 'fileStatistics',
	async parseInput(input, context) {
		log.debug('Extracting file statistics metadata...')

		const allFiles = await getMatches(
			{
				...context.options,
				path: input,
				// Managed below...
				recursive: false,
				// Turn off workspaces, we're passing them in ourselves above
				workspaces: false,
			},
			['**'],
		)

		const totalFileCount = allFiles.length

		const uniqueDirectories = new Set<string>()
		for (const file of allFiles) {
			const directory = dirname(file)
			if (directory !== input) {
				uniqueDirectories.add(directory)
			}
		}

		const totalDirectoryCount = uniqueDirectories.size

		const sizes = await Promise.all(
			allFiles.map(async (file) => {
				try {
					const fileStat = await stat(file)
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
			source: input,
		}
	},
	phase: 2,
})
