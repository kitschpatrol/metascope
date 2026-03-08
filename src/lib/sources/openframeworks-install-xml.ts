import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { OpenframeworksInstallXml } from '../parsers/openframeworks-install-xml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseOpenframeworksInstallXml } from '../parsers/openframeworks-install-xml-parser'

export type OpenframeworksInstallXmlData = Partial<OpenframeworksInstallXml>

export const openframeworksInstallXmlSource: MetadataSource<'openframeworksInstallXml'> = {
	async extract(context: SourceContext): Promise<OpenframeworksInstallXmlData> {
		log.debug('Extracting openFrameworks install.xml metadata...')

		const content = await readFile(resolve(context.path, 'install.xml'), 'utf8')
		return parseOpenframeworksInstallXml(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			const content = await readFile(resolve(context.path, 'install.xml'), 'utf8')
			// Validate it's actually an oF addon install.xml, not some other install.xml
			return parseOpenframeworksInstallXml(content) !== undefined
		} catch {
			return false
		}
	},
	key: 'openframeworksInstallXml',
}
