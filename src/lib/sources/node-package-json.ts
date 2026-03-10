/**
 * Source and parser for `package.json` files.
 *
 * Uses `read-pkg` to parse and normalize package.json content.
 */

// eslint-disable-next-line depend/ban-dependencies
import type { NormalizedPackageJson } from 'read-pkg'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
// eslint-disable-next-line depend/ban-dependencies
import { parsePackage } from 'read-pkg'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'

export type NodePackageJsonData = OneOrMany<SourceRecord<NormalizedPackageJson>> | undefined

/**
 * Parse package.json content and return structured metadata.
 */
export function parse(content: string): NormalizedPackageJson {
	return parsePackage(content)
}

export const nodePackageJsonSource = defineSource<'nodePackageJson'>({
	async getInputs(context) {
		return getMatches(context.options, ['package.json'])
	},
	key: 'nodePackageJson',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: parse(content), source: input }
	},
	phase: 1,
})
