/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseGemspec } from '../parsers/gemspec-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'
import { matchFiles } from './source'

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

export const rubyGemspecSource: MetadataSource<'rubyGemspec'> = {
	async extract(context: SourceContext): Promise<RubyGemspecData> {
		const files = matchFiles(
			context.fileTree,
			context.options.recursive ? ['**/*.gemspec'] : ['*.gemspec'],
		)
		if (files.length === 0) return undefined

		log.debug('Extracting gemspec metadata...')
		const results: Array<SourceRecord<GemSpec>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				results.push({ data: await parse(content), source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'rubyGemspec',
	phase: 1,
}
