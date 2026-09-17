import { gunzipSync } from 'node:zlib'
import fingerprintData from '../data/license-fingerprints.json' with { type: 'json' }

export type LicenseFingerprint = {
	bigrams: Map<string, number>
	hash: string
	name: string
	osiApproved: boolean
	spdxId: string
	totalBigrams: number
	url: string | undefined
	wordSignature: number[]
}

export type FingerprintHeader = {
	dictionary: string[]
	// Some upstream entries omit URLs; JSON encodes missing tuple values as null.
	licenses: Array<[spdxId: string, name: string, url: unknown, osiApproved: boolean]>
}

let fingerprints: LicenseFingerprint[] | undefined

/** Decode the bundled reference fingerprints once, when first needed. */
export function getLicenseFingerprints(): LicenseFingerprint[] {
	fingerprints ??= decodeLicenseFingerprints(fingerprintData)
	return fingerprints
}

/** Decode the versioned build artifact; exported for generator verification. */
export function decodeLicenseFingerprints(data: {
	data: string
	version: number
}): LicenseFingerprint[] {
	if (data.version !== 1) {
		throw new Error(`Unsupported license fingerprint version: ${data.version}`)
	}

	const buffer = gunzipSync(Buffer.from(data.data, 'base64'))
	const headerLength = buffer.readUInt32LE(0)
	const header = JSON.parse(buffer.toString('utf8', 4, 4 + headerLength)) as FingerprintHeader
	let offset = 4 + headerLength
	const readInteger = (): number => {
		let value = 0
		let multiplier = 1
		for (let index = 0; index < 5; index++) {
			const byte = buffer[offset++]
			if (byte === undefined) {
				throw new Error('Truncated license fingerprint data')
			}

			value += (byte % 128) * multiplier
			if (byte < 128) {
				return value
			}

			multiplier *= 128
		}

		throw new Error('Invalid license fingerprint integer')
	}

	const result = header.licenses.map(([spdxId, name, url, osiApproved]) => {
		const hash = buffer.toString('hex', offset, offset + 32)
		offset += 32
		const totalBigrams = readInteger()
		const count = readInteger()
		const bigrams = new Map<string, number>()
		let dictionaryIndex = 0
		for (let index = 0; index < count; index++) {
			dictionaryIndex += readInteger()
			const pair = header.dictionary[dictionaryIndex]
			if (pair === undefined) {
				throw new Error('Invalid license fingerprint dictionary index')
			}

			bigrams.set(pair, readInteger())
		}

		const wordCount = readInteger()
		const wordSignature: number[] = []
		for (let index = 0; index < wordCount; index++) {
			wordSignature.push(buffer.readUInt32LE(offset))
			offset += 4
		}

		return {
			bigrams,
			hash,
			name,
			osiApproved,
			spdxId,
			totalBigrams,
			url: typeof url === 'string' ? url : undefined,
			wordSignature,
		}
	})
	if (offset !== buffer.length) {
		throw new Error('Invalid license fingerprint data length')
	}

	return result
}
