import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import licenses from 'spdx-license-list/full.js'
import { describe, expect, it } from 'vitest'
import { licenseFileSource } from '../src/lib/sources/license-file'
import { identifyLicense } from '../src/lib/utilities/license-identification'
import { getLicenseMutations } from './benchmarks/license-mutations'

const cases = getLicenseMutations()

// Fixture repository names: cspell:ignore baartel escrevenome jayman mahdimajidzadeh wikilicense mooculus pokefans swashdev

describe('license mutation regression corpus', () => {
	it.each(
		cases.filter((entry) => entry.category === 'canonical' || entry.category === 'formatting'),
	)('preserves $label', ({ spdxId, text }) => {
		expect(identifyLicense(text)).toMatchObject({ confidence: 1, spdxId, status: 'exact' })
	})

	it.each(cases.filter((entry) => entry.category === 'modified'))(
		'marks $label as modified',
		({ spdxId, text }) => {
			expect(identifyLicense(text)).toMatchObject({ spdxId, status: 'modified' })
		},
	)

	it.each(cases.filter((entry) => entry.category === 'deleted'))(
		'does not confirm $label as an unchanged license',
		({ text }) => {
			expect(['modified', 'uncertain', undefined]).toContain(identifyLicense(text)?.status)
		},
	)

	it.each(cases.filter((entry) => entry.category === 'uncertain'))(
		'leaves $label uncertain or unidentified',
		({ text }) => {
			expect(['uncertain', undefined]).toContain(identifyLicense(text)?.status)
		},
	)

	it('uses word sequences to retain the Apache candidate after a paragraph deletion', () => {
		const entry = cases.find((candidate) => candidate.label === 'Apache-2.0: missing paragraph')!
		expect(identifyLicense(entry.text)).toMatchObject({ spdxId: 'Apache-2.0', status: 'modified' })
	})

	it('does not select one license from conflicting URL references', () => {
		expect(
			identifyLicense('https://spdx.org/licenses/MIT\nhttps://spdx.org/licenses/Apache-2.0'),
		).toBeUndefined()
	})

	it('retains a GNU header as an uncertain candidate when the body cannot be matched', () => {
		expect(
			identifyLicense('GNU LESSER GENERAL PUBLIC LICENSE version 3\nCustom terms follow.'),
		).toMatchObject({ spdxId: 'LGPL-3.0-only', status: 'uncertain' })
	})

	it.each([
		['baartel-js-escrevenome/LICENCE', 'CC-BY-4.0'],
		['jayman2000-type-that-tune/COPYING.md', 'CC0-1.0'],
		['mahdimajidzadeh-wikilicense/UNLICENSE.md', 'Unlicense'],
		['mooculus-calculus/LICENSE.md', 'CC-BY-NC-SA-4.0'],
		['pokefans-pokefans/COPYING.md', 'AGPL-3.0-only'],
		['swashdev-swashdev-github-io/UNLICENSE.md', 'Unlicense'],
	])('retains the explicit hint in %s as an uncertain candidate', async (path, spdxId) => {
		const text = await readFile(join('test/fixtures/license-file', path), 'utf8')
		expect(identifyLicense(text)).toMatchObject({ spdxId, status: 'uncertain' })
	})

	it('exposes an altered license as a modified source record', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'metascope-modified-license-'))
		try {
			await writeFile(
				join(directory, 'LICENSE'),
				`${licenses.MIT!.licenseText}\nCommercial use is prohibited.`,
			)
			const result = await licenseFileSource.parse('LICENSE', { options: { path: directory } })
			expect(result?.data).toMatchObject({
				match: { spdxId: 'MIT', status: 'modified' },
				type: 'modified',
			})
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})
})
