import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'

export type MetascopeInfo = {
	/** Total scan duration in milliseconds. */
	durationMs?: number
	/** Absolute path to the scanned project directory. */
	path?: string
	/** ISO 8601 timestamp of when the scan was performed. */
	scannedAt?: string
	/** Version of the metascope library used. */
	version?: string
}

export type MetascopeData = SourceRecord<MetascopeInfo> | undefined

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
			data: {
				path: context.path,
				scannedAt: new Date().toISOString(),
				version: getVersion(),
			},
			source: context.path,
		}
	},
	key: 'metascope',
	phase: 1,}
