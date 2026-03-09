import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OneOrMany, SourceRecord } from './source'
import { identifyLicense, spdxIdToUrl } from '../utilities/license-identification'
import { defineSource, getMatches } from './source'

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

export const licenseFileSource = defineSource<'licenseFiles'>({
	async getInputs(context) {
		return getMatches(context.options, [
			'{,un}licen{c,s}e{,.*}',
			'copying{,.lesser}{,.*}',
		])
	},
	key: 'licenseFiles',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const match = identifyLicense(content)
		if (!match) return undefined
		return {
			data: { confidence: match.confidence, spdxId: match.spdxId },
			extra: { spdxUrl: spdxIdToUrl(match.spdxId) },
			source: input,
		}
	},
	phase: 1,
})
