import licenses from 'spdx-license-list/full.js'

const PARAGRAPH_REGEX = /\r?\n\s*\n/v
const COPYRIGHT_LINE_REGEX = /^copyright.*$/imv
const COPYRIGHT_PREFIX_REGEX = /^\s*copyright/iv
const TYPO_WORD_REGEX = /\b(?:permission|redistribution|software)\b/iv

export type LicenseMutation = {
	category: 'canonical' | 'deleted' | 'formatting' | 'modified' | 'reference' | 'uncertain'
	label: string
	spdxId?: string
	text: string
}

/**
 * Cases exercise harmless formatting, changed words/clauses, and ambiguous
 * files.
 */
export function getLicenseMutations(): LicenseMutation[] {
	const cases: LicenseMutation[] = []
	for (const spdxId of [
		'MIT',
		'BSD-2-Clause',
		'BSD-3-Clause',
		'ISC',
		'Zlib',
		'Apache-2.0',
		'MPL-2.0',
	]) {
		const text = licenses[spdxId]!.licenseText
		const paragraphs = text.split(PARAGRAPH_REGEX)
		const longest = paragraphs.toSorted((a, b) => b.length - a.length)[0] ?? ''
		cases.push(
			{ category: 'canonical', label: `${spdxId}: original`, spdxId, text },
			{
				category: 'formatting',
				label: `${spdxId}: whitespace`,
				spdxId,
				text: text.replaceAll(' ', '  ').replaceAll('\n', '\r\n'),
			},
			{
				category: 'formatting',
				label: `${spdxId}: copyright`,
				spdxId,
				text: text.replace(COPYRIGHT_LINE_REGEX, 'Copyright 2026 Example Authors'),
			},
			{
				category: 'formatting',
				label: `${spdxId}: front matter`,
				spdxId,
				text: `---\nproject: example\n---\n${text}`,
			},
			{ category: 'modified', label: `${spdxId}: typo`, spdxId, text: introduceTypo(text) },
			{
				category: 'modified',
				label: `${spdxId}: added restriction`,
				spdxId,
				text: `${text}\n\nCommercial use is prohibited.`,
			},
			{
				category: 'modified',
				label: `${spdxId}: prefixed restriction`,
				spdxId,
				text: `Commercial use is prohibited.\n\n${text}`,
			},
			{
				category: 'deleted',
				label: `${spdxId}: missing paragraph`,
				spdxId,
				text: text.replace(longest, ''),
			},
		)
	}

	cases.push(
		{
			category: 'modified',
			label: 'MIT: negated grant',
			spdxId: 'MIT',
			text: licenses.MIT!.licenseText.replace(
				'Permission is hereby granted',
				'Permission is not granted',
			),
		},
		{
			category: 'uncertain',
			label: 'MIT plus BSD-3-Clause',
			text: `${licenses.MIT!.licenseText}\n${licenses['BSD-3-Clause']!.licenseText}`,
		},
		{
			category: 'uncertain',
			label: 'unrelated prose',
			text: 'This is a description of a project. It contains no permission to use the code.',
		},
		{
			category: 'uncertain',
			label: 'negated MIT reference',
			text: 'This project is not licensed under https://spdx.org/licenses/MIT.',
		},
		{
			category: 'reference',
			label: 'MIT pointer',
			spdxId: 'MIT',
			text: 'See https://spdx.org/licenses/MIT for the full text.',
		},
	)
	return cases
}

function introduceTypo(text: string): string {
	let changed = false
	return text
		.split('\n')
		.map((line) => {
			if (changed || COPYRIGHT_PREFIX_REGEX.test(line)) {
				return line
			}

			return line.replace(TYPO_WORD_REGEX, (word) => {
				changed = true
				return word.slice(0, -1)
			})
		})
		.join('\n')
}
