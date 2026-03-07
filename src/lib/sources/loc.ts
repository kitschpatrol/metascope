import { tokei } from '@kitschpatrol/tokei'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type LocLanguageStats = {
	/** Number of blank lines. */
	blanks: number
	/** Number of lines of code. */
	code: number
	/** Number of comment lines. */
	comments: number
	/** Number of files. */
	files: number
}

export type LocLanguageEntry = LocLanguageStats & {
	/** Programming language name. */
	language: string
}

export type LocData = {
	/** Per-language line count breakdown. */
	breakdown?: LocLanguageEntry[]
	/** Aggregate line counts across all languages. */
	total?: LocLanguageStats
}

export const locSource: MetadataSource<'loc'> = {
	// eslint-disable-next-line ts/require-await -- synchronous native binding wrapped in async interface
	async extract(context: SourceContext): Promise<LocData> {
		log.debug('Extracting lines of code via tokei...')

		const results = tokei({ exclude: ['node_modules'], include: [context.path] })

		const breakdown: LocLanguageEntry[] = results
			.map((entry) => ({
				blanks: entry.blanks,
				code: entry.code,
				comments: entry.comments,
				files: entry.files,
				language: entry.lang,
			}))
			.toSorted((a, b) => b.code - a.code)

		const total: LocLanguageStats = {
			blanks: breakdown.reduce((sum, entry) => sum + entry.blanks, 0),
			code: breakdown.reduce((sum, entry) => sum + entry.code, 0),
			comments: breakdown.reduce((sum, entry) => sum + entry.comments, 0),
			files: breakdown.reduce((sum, entry) => sum + entry.files, 0),
		}

		return { breakdown, total }
	},
	// eslint-disable-next-line ts/require-await -- interface requires async
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'loc',
}
