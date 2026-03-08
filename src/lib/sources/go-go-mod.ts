/* eslint-disable ts/naming-convention */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseGoMod } from '../parsers/go-mod-parser'
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

export type GoGoModData = Partial<GoMod>

// ─── Source ──────────────────────────────────────────────────────────────────

/** Find a `go.mod` file in a directory. */
async function findGoModFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath)
		const goMod = entries.find((entry) => entry === 'go.mod')
		if (goMod) return resolve(directoryPath, goMod)
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const goGoModSource: MetadataSource<'goGoMod'> = {
	async extract(context: SourceContext): Promise<GoGoModData> {
		log.debug('Extracting go.mod metadata...')

		const filePath = await findGoModFile(context.path)
		if (!filePath) return {}

		const content = await readFile(filePath, 'utf8')
		return parse(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findGoModFile(context.path)
		return filePath !== undefined
	},
	key: 'goGoMod',
}
