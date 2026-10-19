import licenses from 'spdx-license-list/full.js'
import { describe, expect, it } from 'vitest'
import { generateLicenseFingerprints } from '../scripts/generate-license-fingerprints'
import data from '../src/lib/data/license-fingerprints.json' with { type: 'json' }
import {
	computeLicenseBigrams,
	computeLicenseWordSignature,
	getLicenseSupplements,
	hashLicenseText,
	normalizeLicenseText,
} from '../src/lib/utilities/license-fingerprint'
import {
	decodeLicenseFingerprints,
	getLicenseFingerprints,
} from '../src/lib/utilities/license-fingerprint-data'

describe('generated license fingerprints', () => {
	it('is reproducible and up to date with the SPDX development dependency', () => {
		expect(generateLicenseFingerprints()).toEqual(data)
	})

	it('preserves every reference, exact hash, and bigram frequency in corpus order', () => {
		const references = Object.entries(licenses).map(([spdxId, entry]) => ({
			normalized: normalizeLicenseText(entry.licenseText),
			spdxId,
		}))
		const expected = [...references, ...getLicenseSupplements(references)]
		const fingerprints = getLicenseFingerprints()
		expect(fingerprints.map((entry) => entry.spdxId)).toEqual(expected.map((entry) => entry.spdxId))
		for (const [index, fingerprint] of fingerprints.entries()) {
			const reference = licenses[fingerprint.spdxId]!
			const { normalized } = expected[index]!
			expect(fingerprint).toEqual({
				bigrams: computeLicenseBigrams(normalized),
				hash: hashLicenseText(normalized),
				name: reference.name,
				osiApproved: reference.osiApproved,
				spdxId: fingerprint.spdxId,
				totalBigrams: normalized.length - 1,
				url: reference.url,
				wordSignature: computeLicenseWordSignature(normalized),
			})
		}
	})

	it('adds standalone supplements for templates that embed another license', () => {
		const supplements = getLicenseFingerprints().slice(Object.keys(licenses).length)
		expect(supplements.map((entry) => entry.spdxId).toSorted()).toEqual([
			'LGPL-3.0',
			'LGPL-3.0+',
			'LGPL-3.0-only',
			'LGPL-3.0-or-later',
			'NPL-1.1',
		])
	})

	it('rejects unsupported data formats', () => {
		expect(() => decodeLicenseFingerprints({ ...data, version: 2 })).toThrow(
			'Unsupported license fingerprint version',
		)
	})
})
