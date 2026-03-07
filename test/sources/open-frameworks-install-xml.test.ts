import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/sources/source'
import { openFrameworksInstallXmlSource } from '../../src/lib/sources/open-frameworks-install-xml'

const fixturesDir = resolve('test/fixtures/open-frameworks-install-xml')

describe('openFrameworksInstallXml source', () => {
	it('should be available in a directory with install.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'elliotwoods-ofxgraycode'),
		}
		expect(await openFrameworksInstallXmlSource.isAvailable(context)).toBe(true)
	})

	it('should not be available in a directory without install.xml', async () => {
		const context: SourceContext = {
			credentials: {},
			path: '/tmp',
		}
		expect(await openFrameworksInstallXmlSource.isAvailable(context)).toBe(false)
	})

	it('should extract parsed metadata from a fixture directory', async () => {
		const context: SourceContext = {
			credentials: {},
			path: resolve(fixturesDir, 'elliotwoods-ofxgraycode'),
		}
		const result = await openFrameworksInstallXmlSource.extract(context)

		expect(result.name).toBe('ofxGraycode')
		expect(result.version).toBe('0.01')
		expect(result.author).toBe('Elliot Woods')
	})
})
