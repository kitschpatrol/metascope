import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import type { LicenseMatch } from '../utilities/license-identification'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { identifyLicense } from '../utilities/license-identification'

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A license file record. The `type` discriminator is always present so the
 * framework's deep-strip never collapses the record to a half-shape:
 *
 * - `type: 'spdx'` with a populated `match` — the file contents map to a known
 *   SPDX template.
 * - `type: 'unknown'` with no `match` — a license file was located on disk but
 *   its contents do not match any SPDX template (e.g. proprietary "All Rights
 *   Reserved" notices). The `source` path is still retained on the surrounding
 *   record. Downstream consumers that need to detect a proprietary project can
 *   either check `data.type === 'unknown'` or fall back to the package manifest
 *   sentinel (`license: "UNLICENSED"` in package.json).
 */
export type LicenseFileRecord = {
	match?: LicenseMatch
	type: 'spdx' | 'unknown'
}

export type LicenseFileData = OneOrMany<SourceRecord<LicenseFileRecord>> | undefined

export const licenseFileSource = defineSource<'licenseFile'>({
	async discover(context) {
		return getMatches(context.options, ['{,un}licen{c,s}e{,.*}', 'copying{,.lesser}{,.*}'])
	},
	key: 'licenseFile',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const match = identifyLicense(content)
		return {
			data: match === undefined ? { type: 'unknown' } : { match, type: 'spdx' },
			source: input,
		}
	},
	phase: 1,
})
