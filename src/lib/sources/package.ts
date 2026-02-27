// eslint-disable-next-line depend/ban-dependencies
import type { NormalizedPackageJson } from 'read-pkg'
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
// eslint-disable-next-line depend/ban-dependencies
import { readPackage } from 'read-pkg'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

// Compelling alternative, but prefer strong normalization
// https://github.com/unjs/pkg-types

export type PackageData = Partial<NormalizedPackageJson>

export const packageSource: MetadataSource<'package'> = {
	async extract(context: SourceContext): Promise<PackageData> {
		log.debug('Extracting package.json metadata...')
		return readPackage({ cwd: context.path })
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(resolve(context.path, 'package.json'))
			return true
		} catch {
			return false
		}
	},
	key: 'package',
}
