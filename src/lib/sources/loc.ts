import { exec } from 'tinyexec'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type LocLanguageStats = {
	blanks: number
	code: number
	comments: number
	files: number
}

export type LocLanguageEntry = LocLanguageStats & {
	language: string
}

export type LocData = {
	breakdown?: LocLanguageEntry[]
	total?: LocLanguageStats
}

const tokeiEntrySchema = z.object({
	blanks: z.number(),
	code: z.number(),
	comments: z.number(),
	reports: z.array(z.unknown()),
})

const tokeiOutputSchema = z.record(z.string(), tokeiEntrySchema)

function parseTokeiOutput(raw: z.infer<typeof tokeiOutputSchema>): LocData {
	const breakdown: LocLanguageEntry[] = []
	let total: LocLanguageStats | undefined

	for (const [language, entry] of Object.entries(raw)) {
		const stats: LocLanguageStats = {
			blanks: entry.blanks,
			code: entry.code,
			comments: entry.comments,
			files: entry.reports.length,
		}

		if (language === 'Total') {
			total = stats
		} else {
			breakdown.push({ ...stats, language })
		}
	}

	// Total's reports is always empty — tokei stores per-file data in children instead.
	// Compute Total's files as the sum of all other languages' file counts.
	if (total?.files === 0) {
		total.files = breakdown.reduce((sum, entry) => sum + entry.files, 0)
	}

	return { breakdown, total }
}

export const locSource: MetadataSource<'loc'> = {
	async extract(context: SourceContext): Promise<LocData> {
		log.debug('Extracting lines of code via tokei...')

		const result = await exec('tokei', [context.path, '--compact', '--output', 'json'])
		const raw = tokeiOutputSchema.parse(JSON.parse(result.stdout))
		return parseTokeiOutput(raw)
	},
	async isAvailable(): Promise<boolean> {
		try {
			await exec('tokei', ['--version'])
			return true
		} catch {
			log.info(
				'tokei is not installed. Install it for lines-of-code analysis: https://github.com/XAMPPRocky/tokei',
			)
			return false
		}
	},
	key: 'loc',
}
