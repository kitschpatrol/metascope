import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PomXml } from '../parsers/pom-xml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePomXml } from '../parsers/pom-xml-parser'

export type PomXmlData = Partial<PomXml>

export const pomXmlSource: MetadataSource<'pomXml'> = {
	async extract(context: SourceContext): Promise<PomXmlData> {
		log.debug('Extracting Maven pom.xml metadata...')

		const content = await readFile(resolve(context.path, 'pom.xml'), 'utf8')
		return parsePomXml(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'pom.xml'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'pomXml',
}

export {
	type PomXmlDependencyEntry,
	type PomXmlLicenseEntry,
	type PomXmlOrganization,
	type PomXmlPersonEntry,
} from '../parsers/pom-xml-parser'
