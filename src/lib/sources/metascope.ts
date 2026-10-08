import type { GetMetadataBaseOptions } from '../metadata-types'
import type { RemoteRepositoryInfo } from '../remote-repository'
import type { SourceRecord } from '../source'
import { version } from '../../../package.json'
import { getWorkspaces } from '../file-matching'
import { defineSource } from '../source'
import { formatPath } from '../utilities/formatting'

export type MetascopeInfo = {
	/** Total scan duration in milliseconds. */
	durationMs: number
	/** Resolved options used for this scan (credentials excluded). */
	options: Omit<GetMetadataBaseOptions, 'credentials'>
	/**
	 * The remote repository that was cloned and scanned, when `path` was a git
	 * URL. Absent for local scans.
	 */
	remote?: RemoteRepositoryInfo
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
	async discover(context) {
		// Always just the root
		return [context.options.path]
	},
	key: 'metascope',
	// eslint-disable-next-line ts/require-await
	async parse(input, context) {
		const {
			absolute,
			offline,
			path: basePath,
			recursive,
			respectIgnored,
			templateData,
			workspaces,
		} = context.options
		return {
			data: {
				durationMs: 0, // Injected later!
				options: {
					absolute,
					offline,
					path: formatPath(basePath, basePath, absolute),
					recursive,
					respectIgnored,
					templateData,
					workspaces,
				},
				remote: context.remote,
				scannedAt: new Date().toISOString(),
				version,
				workspaceDirectories: getWorkspaces(basePath, workspaces).map((directory) =>
					formatPath(directory, basePath, absolute),
				),
			},
			source: input,
		}
	},
	phase: 1,
})
