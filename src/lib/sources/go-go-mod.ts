/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseGoMod } from '../parsers/go-mod-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'
import { matchFiles } from './source'

// ─── Schema & Types ──────────────────────────────────────────────────────────

const goModDependencySchema = z.object({
	module: z.string(),
	version: z.string(),
})

const goModDataSchema = z.object({
	dependencies: z.array(goModDependencySchema),
	go_version: nonEmptyString,
	module: nonEmptyString,
	repository_url: optionalUrl,
	tool_dependencies: stringArray,
})

/** Parsed go.mod metadata */
export type GoMod = z.infer<typeof goModDataSchema>

/** Parse a go.mod file string and validate through the schema. */
export function parse(content: string): GoMod {
	return goModDataSchema.parse(parseGoMod(content))
}

export type GoGoModData = OneOrMany<SourceRecord<GoMod>> | undefined

// ─── Source ──────────────────────────────────────────────────────────────────

export const goGoModSource: MetadataSource<'goGoMod'> = {
	async extract(context: SourceContext): Promise<GoGoModData> {
		const files = matchFiles(
			context.fileTree,
			context.options.recursive ? ['**/go.mod'] : ['go.mod'],
		)
		if (files.length === 0) return undefined

		log.debug('Extracting go.mod metadata...')
		const results: Array<SourceRecord<GoMod>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				results.push({ data: parse(content), source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'goGoMod',
	phase: 1,
}
