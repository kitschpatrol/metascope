import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { openframeworksInstallXmlSource } from '../../src/lib/sources/openframeworks-install-xml'

const fixturesDirectory = resolve('test/fixtures/openframeworks-install-xml')

describe('openframeworksInstallXml source', () => {
	it('should be available in a directory with install.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'elliotwoods-ofxgraycode'),
		}
		expect(await openframeworksInstallXmlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without install.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await openframeworksInstallXmlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDirectory, 'elliotwoods-ofxgraycode'),
		}
		const result = await openframeworksInstallXmlSource.extract(context)

		expect(result.name).toBe('ofxGraycode')
		expect(result.version).toBe('0.01')
		expect(result.author).toBe('Elliot Woods')
	})
})
