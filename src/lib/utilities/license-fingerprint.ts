import { createHash } from 'node:crypto'

/** Apply the existing text normalization to reference and input fingerprints. */
export function normalizeLicenseText(text: string): string {
	return text
		.replaceAll(/^#+\s+/gmv, '')
		.replaceAll(/^copyright.*$/gimv, '')
		.replaceAll(/^\|.*\|$/gmv, '')
		.replaceAll(/^[\-\|:\s]+$/gmv, '')
		.replaceAll(/https?:\/\/\S+/gv, '')
		.replaceAll(/\S+@\S+/gv, '')
		.replaceAll(/[\[\]\(\)]/gv, ' ')
		.replaceAll(/\s+/gv, ' ')
		.trim()
		.toLowerCase()
}

/** Hash normalized text to retain the exact-match fast path without the text. */
export function hashLicenseText(normalized: string): string {
	return createHash('sha256').update(normalized).digest('hex')
}

/** Count UTF-16 character pairs, preserving the original matcher's scoring. */
export function computeLicenseBigrams(text: string): Map<string, number> {
	const counts = new Map<string, number>()
	for (let index = 0; index < text.length - 1; index++) {
		const pair = text.slice(index, index + 2)
		counts.set(pair, (counts.get(pair) ?? 0) + 1)
	}

	return counts
}

/** Compare character-pair frequencies using the Dice coefficient. */
export function licenseDiceScore(
	input: Map<string, number>,
	inputTotal: number,
	reference: Map<string, number>,
	referenceTotal: number,
): number {
	let intersection = 0
	for (const [pair, count] of input) {
		intersection += Math.min(count, reference.get(pair) ?? 0)
	}

	return (2 * intersection) / (inputTotal + referenceTotal)
}

/**
 * Retain the 64 lowest hashes of five-word sequences for compact local-order
 * evidence.
 */
export function computeLicenseWordSignature(normalized: string): number[] {
	const words = normalized.match(/[\p{L}\p{N}]+/gv) ?? []
	const hashes = new Set<number>()
	for (let index = 0; index <= words.length - 5; index++) {
		const hash = createHash('sha256')
			.update(words.slice(index, index + 5).join(' '))
			.digest()
		hashes.add(hash.readUInt32LE())
	}

	return [...hashes].toSorted((a, b) => a - b).slice(0, 64)
}

/** Estimate word-sequence overlap from the bottom 64 hashes of the union. */
export function licenseWordScore(input: number[], reference: number[]): number {
	const union = [...new Set([...input, ...reference])].toSorted((a, b) => a - b).slice(0, 64)
	if (union.length === 0) {
		return 0
	}

	const a = new Set(input)
	const b = new Set(reference)
	const intersection = union.filter((hash) => a.has(hash) && b.has(hash)).length
	const jaccard = intersection / union.length
	return (2 * jaccard) / (1 + jaccard)
}
