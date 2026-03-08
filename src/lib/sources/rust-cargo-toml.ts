import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CargoToml } from '../parsers/rust-cargo-toml-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseCargoToml } from '../parsers/rust-cargo-toml-parser'

export type RustCargoTomlData = Partial<CargoToml>

export const rustCargoTomlSource: MetadataSource<'rustCargoToml'> = {
	async extract(context: SourceContext): Promise<RustCargoTomlData> {
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
	key: 'rustCargoToml',
}
