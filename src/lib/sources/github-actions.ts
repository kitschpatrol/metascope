/**
 * Source for GitHub Actions workflow files.
 *
 * Discovers `.github/workflows/*.yml` and `*.yaml` files and extracts the
 * workflow name and file path from each.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { formatPath } from '../utilities/formatting'

// ─── Schema ─────────────────────────────────────────────────────────

const githubActionSchema = z.object({
	/** Relative path to the workflow file. */
	file: z.string(),
	/** Workflow name from the `name` field. */
	name: z.string(),
})

export type GitHubAction = z.infer<typeof githubActionSchema>

export type GitHubActionsData = OneOrMany<SourceRecord<GitHubAction>> | undefined

// ─── Source ──────────────────────────────────────────────────────────

export const githubActionsSource = defineSource<'githubActions'>({
	async discover(context) {
		return getMatches(context.options, ['.github/workflows/*.{yml,yaml}'])
	},
	key: 'githubActions',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const parsed: unknown = parseYaml(content)
		if (typeof parsed !== 'object' || parsed === null || !('name' in parsed)) return
		const { name } = parsed as Record<string, unknown>
		if (typeof name !== 'string') return

		const file = formatPath(
			resolve(context.options.path, input),
			context.options.path,
			context.options.absolute,
		)

		return {
			data: githubActionSchema.parse({ file, name }),
			source: input,
		}
	},
	phase: 1,
})
