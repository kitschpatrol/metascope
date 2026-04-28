/* eslint-disable unicorn/no-null */
/* eslint-disable ts/naming-convention */

/**
 * Minimal PyPI API response fixtures conforming to Zod schemas in
 * src/lib/sources/python-pypi-registry.ts.
 */

/** Pypi.org/pypi/{name}/json — conforms to pypiResponseSchema */
export const pypiPackages: Record<string, unknown> = {
	codemetapy: {
		info: {
			version: '2.5.3',
			yanked: false,
			yanked_reason: null,
		},
		releases: {
			'1.0.0': [{}],
			'2.0.0': [{}],
			'2.5.3': [{}],
		},
		urls: [
			{
				size: 45_000,
				upload_time_iso_8601: '2024-09-15T12:00:00Z',
			},
		],
	},
}

/**
 * The pypistats.org/api/packages/{name}/recent — conforms to
 * pypistatsRecentSchema
 */
export const pypistatsRecent: Record<string, unknown> = {
	codemetapy: {
		data: {
			last_day: 120,
			last_month: 3500,
			last_week: 850,
		},
	},
}

/**
 * The pypistats.org/api/packages/{name}/overall — conforms to
 * pypistatsOverallSchema
 */
export const pypistatsOverall: Record<string, unknown> = {
	codemetapy: {
		data: [
			{ category: 'with_mirrors', downloads: 25_000 },
			{ category: 'without_mirrors', downloads: 20_000 },
		],
	},
}
