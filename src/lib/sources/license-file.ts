import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { identifyLicense } from '../utilities/license-identification'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseMatch = {
	/** Match confidence between 0 and 1. */
	confidence: number
	/** SPDX license identifier (e.g. "MIT"). */
	spdxId: string
}

export type LicenseFilesData = OneOrMany<SourceRecord<LicenseMatch>> | undefined

export const licenseFileSource = defineSource<'licenseFiles'>({
	async getInputs(context) {
		return getMatches(context.options, ['{,un}licen{c,s}e{,.*}', 'copying{,.lesser}{,.*}'])
	},
	key: 'licenseFiles',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const match = identifyLicense(content)
		if (!match) return
		return {
			data: { confidence: match.confidence, spdxId: match.spdxId },
			source: input,
		}
	},
	phase: 1,
})
