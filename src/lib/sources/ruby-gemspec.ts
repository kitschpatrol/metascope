/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from './source'
import { parseGemspec } from '../parsers/gemspec-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'
import { defineSource, getMatches } from './source'

// ─── Schema ──────────────────────────────────────────────────────────────────

const gemSpecDependencySchema = z.object({
	name: z.string(),
	requirements: z.array(z.string()),
	type: z.enum(['development', 'runtime']),
})

/** @public */
const gemSpecSchema = z.object({
	authors: stringArray,
	bindir: nonEmptyString,
	cert_chain: stringArray,
	dependencies: z.array(gemSpecDependencySchema),
	description: nonEmptyString,
	email: z.union([z.string(), z.array(z.string())]).optional(),
	executables: stringArray,
	extensions: stringArray,
	/** Any attributes not explicitly modeled above */
	extra: z.record(z.string(), z.unknown()),
	extra_rdoc_files: stringArray,
	files: stringArray,
	homepage: optionalUrl,
	license: nonEmptyString,
	licenses: stringArray,
	metadata: z.record(z.string(), z.string()),
	name: nonEmptyString,
	platform: nonEmptyString,
	post_install_message: nonEmptyString,
	rdoc_options: stringArray,
	require_paths: stringArray,
	required_ruby_version: nonEmptyString,
	required_rubygems_version: nonEmptyString,
	signing_key: nonEmptyString,
	summary: nonEmptyString,
	test_files: stringArray,
	version: nonEmptyString,
})

export type GemSpec = z.infer<typeof gemSpecSchema>

// ─── Parse ───────────────────────────────────────────────────────────────────

/** Parse gemspec content and validate through the Zod schema. */
export async function parse(content: string): Promise<GemSpec> {
	const raw = await parseGemspec(content)
	return gemSpecSchema.parse(raw)
}

// ─── Source ──────────────────────────────────────────────────────────────────

export type RubyGemspecData = OneOrMany<SourceRecord<GemSpec>> | undefined

export const rubyGemspecSource = defineSource<'rubyGemspec'>({
	async getInputs(context) {
		return getMatches(context.options, ['*.gemspec'])
	},
	key: 'rubyGemspec',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: await parse(content), source: input }
	},
	phase: 1,
})
