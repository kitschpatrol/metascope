import type { Language, LanguageInfo } from '@kitschpatrol/tokei'
import { tokei } from '@kitschpatrol/tokei'
import path from 'node:path'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

type CodeStatisticsTotals = Omit<LanguageInfo, 'language' | 'reports'> & {
	languages: Language[]
}

type CodeStatisticsFields = {
	/** Per-language line count perLanguage, sorted by lines of code descending. */
	perLanguage?: LanguageInfo[]
	/** Aggregate line counts across all languages. */
	total?: CodeStatisticsTotals
}

export type CodeStatisticsData = SourceRecord<CodeStatisticsFields> | undefined

export const codeStatisticsSource: MetadataSource<'codeStatistics'> = {
	async extract(context: SourceContext): Promise<CodeStatisticsData> {
		log.debug('Extracting lines of code via tokei...')

		const results = await tokei({
			include: [context.options.path],
			noIgnore: context.options.noIgnore,
		})

		const perLanguage = results.toSorted((a, b) => b.code - a.code)

		const total: CodeStatisticsTotals = {
			blanks: perLanguage.reduce((sum, entry) => sum + entry.blanks, 0),
			code: perLanguage.reduce((sum, entry) => sum + entry.code, 0),
			comments: perLanguage.reduce((sum, entry) => sum + entry.comments, 0),
			files: perLanguage.reduce((sum, entry) => sum + entry.files, 0),
			languages: perLanguage.map((entry) => entry.language),
			lines: perLanguage.reduce((sum, entry) => sum + entry.lines, 0),
		}

		return {
			data: { perLanguage, total },
			source: path.relative(context.options.path, context.options.path),
		}
	},
	key: 'codeStatistics',
	phase: 1,
}
