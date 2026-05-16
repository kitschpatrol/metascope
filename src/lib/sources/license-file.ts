import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import type { LicenseMatch } from '../utilities/license-identification'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { identifyLicense } from '../utilities/license-identification'

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A license file record. `match` is `undefined` when a license file was
 * discovered on disk but its contents do not map to an SPDX template (e.g.
 * proprietary "All Rights Reserved" notices). The `source` path on the
 * surrounding record is still useful to downstream consumers — preserve it.
 */
export type LicenseFileRecord = {
	match?: LicenseMatch
}

export type LicenseFileData = OneOrMany<SourceRecord<LicenseFileRecord>> | undefined

export const licenseFileSource = defineSource<'licenseFile'>({
	async discover(context) {
		return getMatches(context.options, ['{,un}licen{c,s}e{,.*}', 'copying{,.lesser}{,.*}'])
	},
	key: 'licenseFile',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return {
			data: { match: identifyLicense(content) },
			source: input,
		}
	},
	phase: 1,
})
