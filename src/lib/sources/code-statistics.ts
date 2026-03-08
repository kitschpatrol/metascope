import type { Language, LanguageInfo } from '@kitschpatrol/tokei'
import { tokei } from '@kitschpatrol/tokei'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type CodeStatisticsTotals = Omit<LanguageInfo, 'language' | 'reports'> & {
	languages: Language[]
}

export type CodeStatisticsData = {
	/** Per-language line count breakdown, sorted by lines of code descending. */
	breakdown?: LanguageInfo[]
	/** Aggregate line counts across all languages. */
	total?: CodeStatisticsTotals
}

export const codeStatisticsSource: MetadataSource<'codeStatistics'> = {
	async extract(context: SourceContext): Promise<CodeStatisticsData> {
		log.debug('Extracting lines of code via tokei...')

		const results = await tokei({ exclude: ['node_modules'], include: [context.path] })

		const breakdown = results.toSorted((a, b) => b.code - a.code)

		const total: CodeStatisticsTotals = {
			blanks: breakdown.reduce((sum, entry) => sum + entry.blanks, 0),
			code: breakdown.reduce((sum, entry) => sum + entry.code, 0),
			comments: breakdown.reduce((sum, entry) => sum + entry.comments, 0),
			files: breakdown.reduce((sum, entry) => sum + entry.files, 0),
			languages: breakdown.map((entry) => entry.language),
			lines: breakdown.reduce((sum, entry) => sum + entry.lines, 0),
		}

		return { breakdown, total }
	},
	// eslint-disable-next-line ts/require-await -- interface requires async
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'codeStatistics',
}
