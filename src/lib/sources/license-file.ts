import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import {
	identifyLicense,
	isLicenseFilename,
	spdxIdToUrl,
} from '../utilities/license-identification'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseFiles = {
	/** SPDX license URLs identified from license file contents. */
	spdxUrls: string[]
}

export type LicenseFilesData = Partial<LicenseFiles>

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
		const spdxUrls = new Set<string>()

		for (const filename of filenames) {
			try {
				const content = await readFile(resolve(context.path, filename), 'utf8')
				const match = identifyLicense(content)
				if (match) {
					spdxUrls.add(spdxIdToUrl(match.spdxId))
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

		if (spdxUrls.size === 0) return {}

		return {
			spdxUrls: [...spdxUrls].toSorted(),
		}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filenames = await findLicenseFiles(context.path)
		return filenames.length > 0
	},
	key: 'licenseFiles',
}
