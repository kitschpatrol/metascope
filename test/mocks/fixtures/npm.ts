/**
 * Minimal npm registry and downloads API response fixtures. Registry response
 * conforms to what `package-json` expects. Downloads response conforms to
 * npmDownloadsSchema in src/lib/sources/node-npm-registry.ts.
 */

/**
 * Registry.npmjs.org/{name} — npm registry metadata (used by package-json
 * library)
 */
export const npmPackages: Record<string, unknown> = {
	metascope: {
		'dist-tags': { latest: '0.2.2' },
		name: 'metascope',
		time: {
			created: '2024-01-15T10:00:00Z',
			modified: '2025-03-01T12:00:00Z',
		},
		versions: {
			'0.2.2': {
				deprecated: undefined,
				dist: {
					fileCount: 42,
					tarball: 'https://registry.npmjs.org/metascope/-/metascope-0.2.2.tgz',
					unpackedSize: 150_000,
				},
				name: 'metascope',
				types: './dist/index.d.ts',
				version: '0.2.2',
			},
		},
	},
}

/**
 * The api.npmjs.org/downloads/point/{period}/{name} — conforms to
 * npmDownloadsSchema
 */
export const npmDownloads: Record<string, number> = {
	metascope: 500,
}
