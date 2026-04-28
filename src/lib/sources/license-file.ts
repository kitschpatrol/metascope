import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OneOrMany, SourceRecord } from '../source'
import type { LicenseMatch } from '../utilities/license-identification'
import { getMatches } from '../file-matching'
import { defineSource } from '../source'
import { identifyLicense } from '../utilities/license-identification'

// ─── Types ──────────────────────────────────────────────────────────

export type LicenseFileData = OneOrMany<SourceRecord<LicenseMatch>> | undefined

export const licenseFileSource = defineSource<'licenseFile'>({
	async discover(context) {
		return getMatches(context.options, ['{,un}licen{c,s}e{,.*}', 'copying{,.lesser}{,.*}'])
	},
	key: 'licenseFile',
	async parse(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		const match = identifyLicense(content)
		if (!match) {
			return
		}

		return {
			data: match,
			source: input,
		}
	},
	phase: 1,
})
