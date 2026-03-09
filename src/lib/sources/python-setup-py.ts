/* eslint-disable ts/naming-convention */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { parseSetupPy } from '../parsers/setup-py-parser'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

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

export type PythonSetupPyData = SourceRecord<SetupPyData> | undefined

// ─── Parse ───────────────────────────────────────────────────────────────────

/** Parse setup.py content and validate through the Zod schema. */
export async function parse(content: string): Promise<SetupPyData> {
	const data = await parseSetupPy(content)
	return setupPyDataSchema.parse(data)
}

// ─── Source ──────────────────────────────────────────────────────────────────

/** Find the first `setup.py` file in a directory. */
async function findSetupPyFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const setupPy = entries.find((entry) => entry === 'setup.py')
		if (setupPy) return resolve(directoryPath, setupPy)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const pythonSetupPySource: MetadataSource<'pythonSetupPy'> = {
	async extract(context: SourceContext): Promise<PythonSetupPyData> {
		log.debug('Extracting Python setup.py metadata...')

		const filePath = await findSetupPyFile(context.path)
		if (!filePath) return undefined

		const content = await readFile(filePath, 'utf8')
		const data = await parse(content)
		return { data, source: filePath }
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findSetupPyFile(context.path)
		return filePath !== undefined
	},
	key: 'pythonSetupPy',
}
