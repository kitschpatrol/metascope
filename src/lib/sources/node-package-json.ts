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
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { matchFiles } from './source'

export type NodePackageJsonData = OneOrMany<SourceRecord<NormalizedPackageJson>> | undefined

/**
 * Parse package.json content and return structured metadata.
 */
export function parse(content: string): NormalizedPackageJson {
	return parsePackage(content)
}

export const nodePackageJsonSource: MetadataSource<'nodePackageJson'> = {
	async extract(context: SourceContext): Promise<NodePackageJsonData> {
		const files = matchFiles(context.fileTree, ['**/package.json'])
		if (files.length === 0) return undefined

		log.debug('Extracting package.json metadata...')
		const results: Array<SourceRecord<NormalizedPackageJson>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				results.push({ data: parse(content), source: file })
			} catch (error) {
				log.warn(
					`Failed to read "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'nodePackageJson',
	phase: 1,
}
