import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'

export type MetascopeData = {
	durationMs?: number
	path?: string
	scannedAt?: string
	version?: string
}

const packageJsonSchema = z.object({
	version: z.string().optional(),
})

function getVersion(): string | undefined {
	try {
		const packageJsonPath = resolve(fileURLToPath(import.meta.url), '../../../package.json')
		const content = readFileSync(packageJsonPath, 'utf8')
		const parsed = packageJsonSchema.parse(JSON.parse(content))
		return parsed.version
	} catch {
		return undefined
	}
}

export const metascopeSource: MetadataSource<'metascope'> = {
	// eslint-disable-next-line ts/require-await
	async extract(context: SourceContext): Promise<MetascopeData> {
		return {
			path: context.path,
			scannedAt: new Date().toISOString(),
			version: getVersion(),
		}
	},
	// eslint-disable-next-line ts/require-await
	async isAvailable(): Promise<boolean> {
		return true
	},
	key: 'metascope',
}
