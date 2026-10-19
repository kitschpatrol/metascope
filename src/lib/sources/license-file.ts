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
 * - `type: 'spdx'` — normalized text matches a template exactly, or the file
 *   explicitly points to a license.
 * - `type: 'modified'` — a close template was found, but the text differs.
 * - `type: 'uncertain'` — a weaker or ambiguous candidate was found.
 * - `type: 'unknown'` with no `match` — a license file was located on disk but
 *   its contents do not match any SPDX template (e.g. proprietary "All Rights
 *   Reserved" notices). The `source` path is still retained on the surrounding
 *   record. Downstream consumers that need to detect a proprietary project can
 *   either check `data.type === 'unknown'` or fall back to the package manifest
 *   sentinel (`license: "UNLICENSED"` in package.json).
 */
export type LicenseFileRecord = {
	match?: LicenseMatch
	type: 'modified' | 'spdx' | 'uncertain' | 'unknown'
}

export type LicenseFileData = OneOrMany<SourceRecord<LicenseFileRecord>> | undefined

function isGpl(record: SourceRecord<LicenseFileRecord>): boolean {
	return record.data.match?.spdxId.startsWith('GPL-') ?? false
}

function isLgpl(record: SourceRecord<LicenseFileRecord>): boolean {
	return record.data.match?.spdxId.startsWith('LGPL-') ?? false
}

/**
 * Put GPL records after the rest when a project also ships the LGPL, as in the
 * GNU convention of COPYING (GPL) beside COPYING.LESSER (LGPL). The LGPL is the
 * project's license; the GPL text is included because the LGPL incorporates it.
 * Consumers that read the first record then see the operative license.
 */
function orderLicenseFiles(data: LicenseFileData): LicenseFileData {
	const shipsBoth =
		Array.isArray(data) &&
		data.some((record) => isLgpl(record)) &&
		data.some((record) => isGpl(record))
	return shipsBoth ? data.toSorted((a, b) => Number(isGpl(a)) - Number(isGpl(b))) : data
}

const licenseFileBaseSource = defineSource<'licenseFile'>({
	async discover(context) {
		return getMatches(context.options, ['{,un}licen{c,s}e{,.*}', 'copying{,.lesser}{,.*}'])
	},
	key: 'licenseFile',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const match = identifyLicense(content)
		const type =
			match === undefined
				? 'unknown'
				: match.status === 'exact' || match.status === 'reference'
					? 'spdx'
					: match.status
		return {
			data: { match, type },
			source: input,
		}
	},
	phase: 1,
})

export const licenseFileSource: typeof licenseFileBaseSource = {
	...licenseFileBaseSource,
	async extract(context) {
		return orderLicenseFiles(await licenseFileBaseSource.extract(context))
	},
}
