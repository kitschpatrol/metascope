/* eslint-disable ts/no-unsafe-member-access */
/* eslint-disable ts/no-explicit-any */

import { parse as parseYaml } from 'yaml'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed goreleaser metadata */
export type GoreleaserData = {
	description: null | string
	homepage: null | string
	license: null | string
	maintainer: null | string
	operating_systems: string[]
	project_name: null | string
	repository_url: null | string
	vendor: null | string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map Go OS identifiers to human-readable names. */
const GOOS_MAP: Record<string, string> = {
	aix: 'AIX',
	android: 'Android',
	darwin: 'macOS',
	dragonfly: 'DragonFly BSD',
	freebsd: 'FreeBSD',
	illumos: 'illumos',
	ios: 'iOS',
	js: 'JavaScript',
	linux: 'Linux',
	netbsd: 'NetBSD',
	openbsd: 'OpenBSD',
	plan9: 'Plan 9',
	solaris: 'Solaris',
	wasip1: 'WASI',
	windows: 'Windows',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

/**
 * Get the first non-empty string value of a given field from an array of
 * package-manager section entries. Skips Go template strings (containing `{{`).
 */
function firstString(sections: unknown[], field: string): null | string {
	for (const section of sections) {
		if (isPlainObject(section)) {
			const value = (section as any)[field]
			if (isNonEmptyString(value) && !value.includes('{{')) {
				return value.trim()
			}
		}
	}

	return null
}

/**
 * Collect all section entries for a given key, handling both v1 singular
 * and v2 plural forms.
 */
function collectSections(data: Record<string, unknown>, ...keys: string[]): unknown[] {
	const result: unknown[] = []
	for (const key of keys) {
		const value = data[key]
		if (Array.isArray(value)) {
			result.push(...value)
		} else if (isPlainObject(value)) {
			result.push(value)
		}
	}

	return result
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse a .goreleaser.yml/.yaml file and return structured metadata.
 *
 * Aggregates metadata from multiple package-manager sections (nfpms, brews,
 * scoops, snapcrafts, chocolateys, winget, aurs) with defined priority.
 * Extracts operating systems from builds[].goos.
 */
export function parseGoreleaser(source: string): GoreleaserData | undefined {
	let data: unknown
	try {
		data = parseYaml(source)
	} catch {
		return undefined
	}

	if (!isPlainObject(data)) return undefined

	const result: GoreleaserData = {
		description: null,
		homepage: null,
		license: null,
		maintainer: null,
		operating_systems: [],
		project_name: null,
		repository_url: null,
		vendor: null,
	}

	// Project_name
	if (isNonEmptyString(data.project_name)) {
		result.project_name = data.project_name
	}

	// Collect package manager sections (priority order)
	const nfpms = collectSections(data, 'nfpms', 'nfpm')
	const brews = collectSections(data, 'brews', 'brew', 'homebrew_casks')
	const snaps = collectSections(data, 'snapcrafts', 'snapcraft')
	const scoops = collectSections(data, 'scoops', 'scoop')
	const chocs = collectSections(data, 'chocolateys', 'chocolatey')
	const winget = collectSections(data, 'winget')
	const aurs = collectSections(data, 'aurs', 'aur')
	const krews = collectSections(data, 'krews', 'krew')

	const allSections = [
		...nfpms,
		...brews,
		...snaps,
		...scoops,
		...chocs,
		...winget,
		...aurs,
		...krews,
	]

	// Description
	result.description =
		firstString(allSections, 'description') ??
		firstString(snaps, 'summary') ??
		firstString(chocs, 'summary') ??
		firstString(winget, 'short_description')

	// Homepage
	result.homepage = firstString(allSections, 'homepage') ?? firstString(chocs, 'project_url')

	// License
	result.license = firstString(allSections, 'license')

	// Maintainer
	result.maintainer = firstString(nfpms, 'maintainer') ?? firstString(aurs, 'maintainer')

	// Vendor
	result.vendor =
		firstString(nfpms, 'vendor') ?? firstString(chocs, 'owners') ?? firstString(winget, 'publisher')

	// Release.github/gitlab → repository_url
	if (isPlainObject(data.release)) {
		const { release } = data
		if (isPlainObject(release.github)) {
			const gh = release.github
			if (typeof gh.owner === 'string' && typeof gh.name === 'string') {
				result.repository_url = `https://github.com/${gh.owner}/${gh.name}`
			}
		} else if (isPlainObject(release.gitlab)) {
			const gl = release.gitlab
			if (typeof gl.owner === 'string' && typeof gl.name === 'string') {
				result.repository_url = `https://gitlab.com/${gl.owner}/${gl.name}`
			}
		}
	}

	// Builds[].goos → operating_systems
	const goosSet = new Set<string>()
	const builds = collectSections(data, 'builds', 'build')
	for (const build of builds) {
		if (isPlainObject(build)) {
			const { goos } = build
			if (Array.isArray(goos)) {
				for (const os of goos) {
					if (typeof os === 'string') {
						goosSet.add(os.toLowerCase())
					}
				}
			}
		}
	}

	result.operating_systems = [...goosSet].map(
		(os) => GOOS_MAP[os] ?? os.charAt(0).toUpperCase() + os.slice(1),
	)

	return result
}
