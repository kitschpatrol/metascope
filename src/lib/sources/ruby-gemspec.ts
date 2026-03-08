/* eslint-disable ts/naming-convention */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseGemspec } from '../parsers/gemspec-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

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

export type RubyGemspecData = Partial<GemSpec>

/** Find the first `*.gemspec` file in a directory. */
async function findGemspecFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const gemspec = entries.find((entry) => entry.endsWith('.gemspec'))
		if (gemspec) return resolve(directoryPath, gemspec)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const rubyGemspecSource: MetadataSource<'rubyGemspec'> = {
	async extract(context: SourceContext): Promise<RubyGemspecData> {
		log.debug('Extracting gemspec metadata...')

		const filePath = await findGemspecFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parse(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findGemspecFile(context.path)
		return filePath !== undefined
	},
	key: 'rubyGemspec',
}
