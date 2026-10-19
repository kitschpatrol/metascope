import { describe, expect, it } from 'vitest'
import { getMetadata } from '../src/lib/metadata'

/**
 * A Cinder block that also ships a codemeta.json. The cinderblock.xml source
 * outranks codemeta.json, so values both files describe must merge cleanly
 * rather than duplicate or degrade.
 */
describe('codemeta template for a cinderblock.xml with a codemeta.json', () => {
	async function getCodemeta() {
		return getMetadata({
			offline: true,
			path: 'test/fixtures/cinderblock-codemeta',
			sources: ['cinderCinderblockXml', 'codemetaJson'],
			template: 'codemeta',
		})
	}

	it('should list each operating system once', async () => {
		const result = await getCodemeta()
		expect(result.operatingSystem).toEqual(['Windows', 'macOS'])
	})

	it('should keep codemeta.json dependency types and links', async () => {
		const result = await getCodemeta()
		expect(result.softwareRequirements).toEqual([
			{
				'@type': 'SoftwareSourceCode',
				codeRepository: 'https://github.com/cinder/Cinder.git',
				name: 'Cinder',
				version: '0.9.1',
			},
			{
				'@type': 'SoftwareApplication',
				name: 'Vendor SDK',
				url: 'https://example.com/sdk',
			},
		])
	})

	it('should pass a non-SPDX license through instead of building an SPDX URL', async () => {
		const result = await getCodemeta()
		expect(result.license).toBe('MIT + Proprietary')
	})
})
