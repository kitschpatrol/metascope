import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CargoToml } from '../parsers/cargo-toml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseCargoToml } from '../parsers/cargo-toml-parser'

export type CargoTomlAuthorEntry = CargoToml['authors'][number]
export type CargoTomlDependencyEntry = CargoToml['dependencies'][number]

export type CargoTomlData = Partial<CargoToml>

export const cargoTomlSource: MetadataSource<'cargoToml'> = {
	async extract(context: SourceContext): Promise<CargoTomlData> {
		log.debug('Extracting Cargo.toml metadata...')

		const content = await readFile(resolve(context.path, 'Cargo.toml'), 'utf8')
		return parseCargoToml(content) ?? {}
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await readFile(resolve(context.path, 'Cargo.toml'), 'utf8')
			return true
		} catch {
			return false
		}
	},
	key: 'cargoToml',
}
