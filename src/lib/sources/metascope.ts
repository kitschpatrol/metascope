import type { GetMetadataBaseOptions } from '../metadata-types'
import type { SourceRecord } from './source'
import { version } from '../../../package.json'
import { defineSource, getWorkspaces } from './source'

export type MetascopeInfo = {
	/** Total scan duration in milliseconds. */
	durationMs: number
	/** TODO */
	options: Omit<GetMetadataBaseOptions, 'credentials'>
	/** ISO 8601 timestamp of when the scan was performed. */
	scannedAt: string
	/** Version of the metascope library used. */
	version: string
	/** Workspaces Resolved */
	workspaceDirectories: string[]
}

export type MetascopeData = SourceRecord<MetascopeInfo> | undefined

export const metascopeSource = defineSource<'metascope'>({
	// eslint-disable-next-line ts/require-await
	async getInputs(context) {
		return [context.options.path]
	},
	key: 'metascope',
	// eslint-disable-next-line ts/require-await
	async parseInput(input, context) {
		return {
			data: {
				durationMs: 0, // Injected later!
				options: {
					offline: context.options.offline ?? false,
					path: context.options.path,
					recursive: context.options.recursive ?? false,
					respectIgnored: context.options.respectIgnored ?? true,
					templateData: context.options.templateData,
					workspaces: context.options.workspaces,
				},
				scannedAt: new Date().toISOString(),
				version,
				workspaceDirectories: getWorkspaces(context.options.path, context.options.workspaces),
			},
			source: input,
		}
	},
	phase: 1,
})
