import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import licenses from 'spdx-license-list/full.js'
import { version as sourceVersion } from 'spdx-license-list/package.json' with { type: 'json' }
import type { FingerprintHeader } from '../src/lib/utilities/license-fingerprint-data'
import {
	computeLicenseBigrams,
	computeLicenseWordSignature,
	hashLicenseText,
	normalizeLicenseText,
} from '../src/lib/utilities/license-fingerprint'

/** Build a deterministic corpus with exact hashes and lossless bigram counts. */
export function generateLicenseFingerprints(): {
	data: string
	sourceVersion: string
	version: number
} {
	const entries = Object.entries(licenses).map(([spdxId, entry]) => {
		const normalized = normalizeLicenseText(entry.licenseText)
		return { ...entry, bigrams: computeLicenseBigrams(normalized), normalized, spdxId }
	})
	const dictionary = [
		...new Set(entries.flatMap((entry) => entry.bigrams.keys().toArray())),
	].toSorted()
	const dictionaryIndex = new Map(dictionary.map((pair, index) => [pair, index]))
	const header: FingerprintHeader = {
		dictionary,
		licenses: entries.map(({ name, osiApproved, spdxId, url }) => [spdxId, name, url, osiApproved]),
	}
	const headerBytes = Buffer.from(JSON.stringify(header))
	const length = Buffer.alloc(4)
	length.writeUInt32LE(headerBytes.length)
	const chunks = [length, headerBytes]
	for (const entry of entries) {
		const counts = Array.from(
			entry.bigrams,
			([pair, count]) => [dictionaryIndex.get(pair)!, count] as const,
		)
		counts.sort(([a], [b]) => a - b)
		const bytes: number[] = []
		writeInteger(bytes, entry.normalized.length - 1)
		writeInteger(bytes, counts.length)
		let previous = 0
		for (const [index, count] of counts) {
			writeInteger(bytes, index - previous)
			writeInteger(bytes, count)
			previous = index
		}

		const signature = computeLicenseWordSignature(entry.normalized)
		writeInteger(bytes, signature.length)
		const words = Buffer.alloc(signature.length * 4)
		for (const [index, hash] of signature.entries()) {
			words.writeUInt32LE(hash, index * 4)
		}

		chunks.push(Buffer.from(hashLicenseText(entry.normalized), 'hex'), Buffer.from(bytes), words)
	}

	return {
		data: gzipSync(Buffer.concat(chunks), { level: 9 }).toString('base64'),
		sourceVersion,
		version: 1,
	}
}

function writeInteger(bytes: number[], value: number): void {
	do {
		const byte = value % 128
		value = Math.floor(value / 128)
		bytes.push(byte + (value > 0 ? 128 : 0))
	} while (value > 0)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
	const destination = resolve(import.meta.dirname, '../src/lib/data/license-fingerprints.json')
	const content = `${JSON.stringify(generateLicenseFingerprints())}\n`
	let previous: string | undefined
	try {
		previous = await readFile(destination, 'utf8')
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
			throw error
		}
	}

	if (previous !== content) {
		await writeFile(destination, content)
	}

	console.log(
		`License fingerprints: ${Buffer.byteLength(content)} bytes for ${Object.keys(licenses).length} licenses`,
	)
}
