import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OpenFrameworksInstallXml } from '../parsers/open-frameworks-install-xml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseOpenFrameworksInstallXml } from '../parsers/open-frameworks-install-xml-parser'

export type OpenFrameworksInstallXmlData = Partial<OpenFrameworksInstallXml>

export const openFrameworksInstallXmlSource: MetadataSource<'openFrameworksInstallXml'> = {
	async extract(context: SourceContext): Promise<OpenFrameworksInstallXmlData> {
		log.debug('Extracting openFrameworks install.xml metadata...')

		const content = await readFile(resolve(context.path, 'install.xml'), 'utf8')
		return parseOpenFrameworksInstallXml(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			const content = await readFile(resolve(context.path, 'install.xml'), 'utf8')
			// Validate it's actually an oF addon install.xml, not some other install.xml
			return parseOpenFrameworksInstallXml(content) !== undefined
		} catch {
			return false
		}
	},
	key: 'openFrameworksInstallXml',
}
