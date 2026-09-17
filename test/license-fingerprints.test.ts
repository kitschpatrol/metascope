import licenses from 'spdx-license-list/full.js'
import { describe, expect, it } from 'vitest'
import { generateLicenseFingerprints } from '../scripts/generate-license-fingerprints'
import data from '../src/lib/data/license-fingerprints.json' with { type: 'json' }
import {
	computeLicenseBigrams,
	computeLicenseWordSignature,
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
		const fingerprints = getLicenseFingerprints()
		expect(fingerprints.map((entry) => entry.spdxId)).toEqual(Object.keys(licenses))
		for (const fingerprint of fingerprints) {
			const reference = licenses[fingerprint.spdxId]!
			const normalized = normalizeLicenseText(reference.licenseText)
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

	it('rejects unsupported data formats', () => {
		expect(() => decodeLicenseFingerprints({ ...data, version: 2 })).toThrow(
			'Unsupported license fingerprint version',
		)
	})
})
