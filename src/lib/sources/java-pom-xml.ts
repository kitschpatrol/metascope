import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PomXml } from '../parsers/java-pom-xml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parsePomXml } from '../parsers/java-pom-xml-parser'

export type JavaPomXmlData = Partial<PomXml>

export const javaPomXmlSource: MetadataSource<'javaPomXml'> = {
	async extract(context: SourceContext): Promise<JavaPomXmlData> {
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
	key: 'javaPomXml',
}
