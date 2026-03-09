/* eslint-disable ts/naming-convention */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseSetupPy } from '../parsers/setup-py-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'
import { matchFiles } from './source'

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

export const pythonSetupPySource: MetadataSource<'pythonSetupPy'> = {
	async extract(context: SourceContext): Promise<PythonSetupPyData> {
		const files = matchFiles(
			context.fileTree,
			context.options.recursive ? ['**/setup.py'] : ['setup.py'],
		)
		if (files.length === 0) return undefined

		log.debug('Extracting Python setup.py metadata...')
		const results: Array<SourceRecord<SetupPyData>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				const data = await parse(content)
				results.push({ data, source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'pythonSetupPy',
	phase: 1,
}
