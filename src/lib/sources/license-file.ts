import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import {
	identifyLicense,
	isLicenseFilename,
	spdxIdToUrl,
} from '../utilities/license-identification'

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

export type LicenseFilesData = Array<SourceRecord<LicenseMatch, LicenseMatchExtra>>

/**
 * Find all license-like filenames in a directory.
 */
async function findLicenseFiles(directoryPath: string): Promise<string[]> {
	try {
		const entries = await readdir(directoryPath, { withFileTypes: true })
		return entries
			.filter((entry) => entry.isFile() && isLicenseFilename(entry.name))
			.map((entry) => entry.name)
	} catch {
		return []
	}
}

export const licenseFileSource: MetadataSource<'licenseFiles'> = {
	async extract(context: SourceContext): Promise<LicenseFilesData> {
		log.debug('Extracting license file metadata...')

		const filenames = await findLicenseFiles(context.path)
		const results: LicenseFilesData = []

		for (const filename of filenames) {
			try {
				const content = await readFile(resolve(context.path, filename), 'utf8')
				const match = identifyLicense(content)
				if (match) {
					results.push({
						data: { confidence: match.confidence, spdxId: match.spdxId },
						extra: { spdxUrl: spdxIdToUrl(match.spdxId) },
						source: resolve(context.path, filename),
					})
					log.debug(
						`License file "${filename}": ${match.spdxId} (confidence: ${match.confidence.toFixed(2)})`,
					)
				} else {
					log.debug(`License file "${filename}": no SPDX match`)
				}
			} catch (error) {
				log.warn(
					`Failed to read license file "${filename}": ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		return results
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filenames = await findLicenseFiles(context.path)
		return filenames.length > 0
	},
	key: 'licenseFiles',
}
