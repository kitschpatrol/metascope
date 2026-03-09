import type { Language, LanguageInfo } from '@kitschpatrol/tokei'
import { tokei } from '@kitschpatrol/tokei'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

type CodeStatisticsTotals = Omit<LanguageInfo, 'language' | 'reports'> & {
	languages: Language[]
}

export type CodeStatisticsFields = {
	/** Per-language line count breakdown, sorted by lines of code descending. */
	breakdown?: LanguageInfo[]
}

export type CodeStatisticsExtra = {
	/** Aggregate line counts across all languages. */
	total?: CodeStatisticsTotals
}

export type CodeStatisticsData = SourceRecord<CodeStatisticsFields, CodeStatisticsExtra> | undefined

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

		return {
			data: { breakdown },
			extra: { total },
			source: context.path,
		}
	},
	key: 'codeStatistics',
	phase: 2,}
