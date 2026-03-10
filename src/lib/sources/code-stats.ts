import type { Language, LanguageInfo } from '@kitschpatrol/tokei'
import { tokei } from '@kitschpatrol/tokei'
import type { OneOrMany, SourceContext, SourceRecord } from '../source'
import { getWorkspaces } from '../file-matching'
import { log } from '../log'
import { defineSource } from '../source'

type CodeStatsTotals = Omit<LanguageInfo, 'language' | 'reports'> & {
	languages: Language[]
}

type CodeStatsFields = {
	/** Per-language line count perLanguage, sorted by lines of code descending. */
	perLanguage?: LanguageInfo[]
	/** Aggregate line counts across all languages. */
	total?: CodeStatsTotals
}

export type CodeStatsData = OneOrMany<SourceRecord<CodeStatsFields>> | undefined

async function getStatistics(
	directory: string,
	options: SourceContext['options'],
): Promise<SourceRecord<CodeStatsFields>> {
	const results = await tokei({
		include: [directory],
		noIgnore: !options.respectIgnored,
		noIgnoreDot: !options.respectIgnored,
		noIgnoreVcs: !options.respectIgnored,
	})

	const perLanguage = results.toSorted((a, b) => b.code - a.code)

	const total: CodeStatsTotals = {
		blanks: perLanguage.reduce((sum, entry) => sum + entry.blanks, 0),
		code: perLanguage.reduce((sum, entry) => sum + entry.code, 0),
		comments: perLanguage.reduce((sum, entry) => sum + entry.comments, 0),
		files: perLanguage.reduce((sum, entry) => sum + entry.files, 0),
		languages: perLanguage.map((entry) => entry.language),
		lines: perLanguage.reduce((sum, entry) => sum + entry.lines, 0),
	}

	return {
		data: { perLanguage, total },
		source: directory,
	}
}

export const codeStatsSource = defineSource<'codeStats'>({
	// eslint-disable-next-line ts/require-await
	async getInputs(context) {
		return [
			context.options.path,
			...getWorkspaces(context.options.path, context.options.workspaces),
		]
	},
	key: 'codeStats',
	async parseInput(input, context) {
		log.debug('Extracting lines of code via tokei...')
		return getStatistics(input, context.options)
	},
	phase: 1,
})
