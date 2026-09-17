import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'
import fingerprints from '../src/lib/data/license-fingerprints.json' with { type: 'json' }
import { identifyLicense } from '../src/lib/utilities/license-identification'
import baseline from '../test/benchmarks/license-matching-baseline.json' with { type: 'json' }
import { getLicenseMutations } from '../test/benchmarks/license-mutations'

const rows = getLicenseMutations().map((entry) => {
	const previous = baseline.find((row) => row.label === entry.label)
	assert.equal(
		createHash('sha256').update(entry.text).digest('hex'),
		previous?.inputHash,
		`Baseline input changed: ${entry.label}`,
	)
	const start = performance.now()
	const match = identifyLicense(entry.text)
	return { ...entry, baseline: previous?.match, durationMs: performance.now() - start, match }
})

const categories = Array.from(new Set(rows.map((row) => row.category)), (category) => {
	const group = rows.filter((row) => row.category === category)
	return {
		baselineCorrectId: group.filter(
			(row) => row.spdxId !== undefined && row.baseline?.spdxId === row.spdxId,
		).length,
		baselineSpdxAssertions: group.filter((row) => row.baseline !== undefined).length,
		cases: group.length,
		category,
		currentCorrectId: group.filter(
			(row) => row.spdxId !== undefined && row.match?.spdxId === row.spdxId,
		).length,
		currentSpdxAssertions: group.filter(
			(row) => row.match?.status === 'exact' || row.match?.status === 'reference',
		).length,
	}
})

console.log(
	JSON.stringify(
		{
			cases: rows.length,
			categories,
			dataBytes: Buffer.byteLength(JSON.stringify(fingerprints)),
			firstMatchMs: rows[0]?.durationMs,
			gzipDataBytes: gzipSync(JSON.stringify(fingerprints)).length,
			uncertainCandidates: rows
				.filter((row) => row.match?.status === 'uncertain')
				.map((row) => ({ candidate: row.match?.spdxId, label: row.label })),
			warmMeanMs: rows.slice(1).reduce((sum, row) => sum + row.durationMs, 0) / (rows.length - 1),
		},
		undefined,
		2,
	),
)
