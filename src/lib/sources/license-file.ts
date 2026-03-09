import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MetadataSource, OneOrMany, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { identifyLicense, spdxIdToUrl } from '../utilities/license-identification'
import { matchFiles } from './source'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseMatch = {
	/** Match confidence between 0 and 1. */
	confidence: number
	/** SPDX license identifier (e.g. "MIT"). */
	spdxId: string
}

export type LicenseMatchExtra = {
	/** SPDX license URL. */
	spdxUrl: string
}

export type LicenseFilesData = OneOrMany<SourceRecord<LicenseMatch, LicenseMatchExtra>> | undefined

export const licenseFileSource: MetadataSource<'licenseFiles'> = {
	async extract(context: SourceContext): Promise<LicenseFilesData> {
		const files = matchFiles(
			context.fileTree,
			['**/{,un}licen{c,s}e{,.*}', '**/copying{,.lesser}{,.*}'],
			{ nocase: true },
		)
		if (files.length === 0) return undefined

		log.debug('Extracting license file metadata...')
		const results: Array<SourceRecord<LicenseMatch, LicenseMatchExtra>> = []

		for (const file of files) {
			try {
				const content = await readFile(resolve(context.options.path, file), 'utf8')
				const match = identifyLicense(content)
				if (match) {
					results.push({
						data: { confidence: match.confidence, spdxId: match.spdxId },
						extra: { spdxUrl: spdxIdToUrl(match.spdxId) },
						source: file,
					})
					log.debug(
						`License file "${file}": ${match.spdxId} (confidence: ${match.confidence.toFixed(2)})`,
					)
				} else {
					log.debug(`License file "${file}": no SPDX match`)
				}
			} catch (error) {
				log.warn(
					`Failed to read license file "${file}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		if (results.length === 0) return undefined
		return results.length === 1 ? results[0] : results
	},
	key: 'licenseFiles',
	phase: 1,
}
