import { stat } from 'node:fs/promises'
import path, { dirname } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches, getWorkspaces } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'
import { batchMap } from '../utilities/formatting'

export type FileStats = {
	/** Name of repo folder, possibly useful as a name fallback */
	folderName?: string
	/** Total number of directories (recursive). */
	totalDirectoryCount?: number
	/** Total number of files (recursive). */
	totalFileCount?: number
	/** Total size of all files in bytes. */
	totalSizeBytes?: number
}

export type FileStatsData = OneOrMany<SourceRecord<FileStats>> | undefined

export const fileStatsSource = defineSource<'fileStats'>({
	// eslint-disable-next-line ts/require-await
	async discover(context) {
		return [
			context.options.path,
			...getWorkspaces(context.options.path, context.options.workspaces),
		]
	},
	key: 'fileStats',
	async parse(input, context) {
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

		const sizes = await batchMap(
			allFiles,
			async (file) => {
				try {
					const fileStat = await stat(file)
					return fileStat.size
				} catch {
					return 0
				}
			},
			100,
		)

		const totalSizeBytes = sizes.reduce((sum, size) => sum + size, 0)

		return {
			data: {
				folderName: input.split(path.sep).at(-1),
				totalDirectoryCount,
				totalFileCount,
				totalSizeBytes,
			},
			source: input,
		}
	},
	phase: 1,
})
