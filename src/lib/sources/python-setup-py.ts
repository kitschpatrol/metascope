/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from './source'
import { parseSetupPy } from '../parsers/setup-py-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'
import { defineSource, getMatches } from './source'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed setup.py metadata */

const setupPyDataSchema = z.object({
	author: nonEmptyString,
	author_email: nonEmptyString,
	classifiers: stringArray,
	description: nonEmptyString,
	download_url: optionalUrl,
	extras_require: z.record(z.string(), z.array(z.string())),
	install_requires: stringArray,
	keywords: z.array(z.string()).optional(),
	license: nonEmptyString,
	long_description: nonEmptyString,
	maintainer: nonEmptyString,
	maintainer_email: nonEmptyString,
	name: nonEmptyString,
	project_urls: z.record(z.string(), z.string()),
	python_requires: nonEmptyString,
	url: optionalUrl,
	version: nonEmptyString,
})

export type SetupPyData = z.infer<typeof setupPyDataSchema>

export type PythonSetupPyData = OneOrMany<SourceRecord<SetupPyData>> | undefined

// ─── Parse ───────────────────────────────────────────────────────────────────

/** Parse setup.py content and validate through the Zod schema. */
export async function parse(content: string): Promise<SetupPyData> {
	const data = await parseSetupPy(content)
	return setupPyDataSchema.parse(data)
}

// ─── Source ──────────────────────────────────────────────────────────────────

export const pythonSetupPySource = defineSource<'pythonSetupPy'>({
	async getInputs(context) {
		return getMatches(context.options, ['setup.py'])
	},
	key: 'pythonSetupPy',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: await parse(content), source: input }
	},
	phase: 1,
})
