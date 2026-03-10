/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { parseGoMod } from '../parsers/go-mod-parser'
import { defineSource } from '../source'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives'

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

export const goGoModSource = defineSource<'goGoMod'>({
	async discover(context) {
		return getMatches(context.options, ['go.mod'])
	},
	key: 'goGoMod',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: parse(content), source: input }
	},
	phase: 1,
})
