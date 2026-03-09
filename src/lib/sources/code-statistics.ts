import type { Language, LanguageInfo } from '@kitschpatrol/tokei'
import { tokei } from '@kitschpatrol/tokei'
import path from 'node:path'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
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

export type CodeStatisticsData = OneOrMany<SourceRecord<CodeStatisticsFields>> | undefined

async function getStatistics(
	directory: string,
	options: SourceContext['options'],
): Promise<SourceRecord<CodeStatisticsFields>> {
	const results = await tokei({
		include: [directory],
		noIgnore: !options.respectIgnored,
		noIgnoreDot: !options.respectIgnored,
		noIgnoreVcs: !options.respectIgnored,
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
		source: path.relative(options.path, directory),
	}
}

export const codeStatisticsSource: MetadataSource<'codeStatistics'> = {
	async extract(context: SourceContext): Promise<CodeStatisticsData> {
		log.debug('Extracting lines of code via tokei...')

		if (context.options.recursive && context.workspaces.length > 1) {
			return Promise.all(
				context.workspaces.map(async (workspaceDirectory) =>
					getStatistics(workspaceDirectory, context.options),
				),
			)
		}

		return getStatistics(context.options.path, context.options)
	},
	key: 'codeStatistics',
	phase: 1,
}
