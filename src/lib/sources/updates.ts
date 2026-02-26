import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { coerce, diff } from 'semver'
import { exec } from 'tinyexec'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type UpdatesPackage = {
	age?: string
	info?: string
	name: string
	new: string
	old: string
}

export type UpdatesData = {
	libyears?: number
	major?: UpdatesPackage[]
	minor?: UpdatesPackage[]
	patch?: UpdatesPackage[]
	total?: number
}

const depSchema = z.object({
	age: z.string().optional(),
	info: z.string().optional(),
	new: z.string(),
	old: z.string(),
})

const updatesOutputSchema = z.object({
	results: z.record(z.string(), z.record(z.string(), z.record(z.string(), depSchema))),
})

/**
 * Resolve the path to the `updates` CLI binary from its installed package.
 */
function resolveUpdatesBinary(): string {
	const require = createRequire(import.meta.url)
	const packageJsonPath = require.resolve('updates/package.json')
	// eslint-disable-next-line ts/no-unsafe-type-assertion -- Known package.json shape
	const packageJson = require(packageJsonPath) as { bin: string }
	return join(dirname(packageJsonPath), packageJson.bin)
}

/**
 * Parse an age string from the `updates` CLI (via the `timerel` library) into fractional years.
 *
 * Possible formats: "now", "<n> sec(s)", "<n> min(s)", "<n> hour(s)",
 * "<n> day(s)", "<n> week(s)", "<n> month(s)", "<n> year(s)"
 */
function parseAgeToYears(age: string): number {
	if (age === 'now') return 0

	const match = /^(\d+)\s+(\w+)$/.exec(age.trim())
	if (!match) return 0

	const value = Number(match[1])
	const unit = match[2]

	switch (unit) {
		case 'day':
		case 'days': {
			return value / 365.25
		}

		case 'hour':
		case 'hours': {
			return value / (365.25 * 24)
		}

		case 'min':
		case 'mins': {
			return value / (365.25 * 24 * 60)
		}

		case 'month':
		case 'months': {
			return value / 12
		}

		case 'sec':
		case 'secs': {
			return value / (365.25 * 24 * 60 * 60)
		}

		case 'week':
		case 'weeks': {
			return (value * 7) / 365.25
		}

		case 'year':
		case 'years': {
			return value
		}

		default: {
			return 0
		}
	}
}

/**
 * Classify a version bump as major, minor, or patch using semver.
 * Falls back to 'major' for non-semver versions (e.g. GitHub Actions tags).
 */
function classifyBump(oldVersion: string, newVersion: string): 'major' | 'minor' | 'patch' {
	const oldSemver = coerce(oldVersion)
	const newSemver = coerce(newVersion)
	if (!oldSemver || !newSemver) return 'major'

	const result = diff(oldSemver, newSemver)
	if (!result) return 'major'

	if (result.startsWith('major') || result === 'premajor') return 'major'
	if (result.startsWith('minor') || result === 'preminor') return 'minor'
	return 'patch'
}

export const updatesSource: MetadataSource<'updates'> = {
	async extract(context: SourceContext): Promise<UpdatesData> {
		log.debug('Extracting dependency update information via updates...')

		const updatesBinary = resolveUpdatesBinary()
		const result = await exec('node', [updatesBinary, '--file', context.path, '--json'])
		const parsed = updatesOutputSchema.parse(JSON.parse(result.stdout))

		const major: UpdatesPackage[] = []
		const minor: UpdatesPackage[] = []
		const patch: UpdatesPackage[] = []
		let libyears = 0

		for (const mode of Object.values(parsed.results)) {
			for (const depGroup of Object.values(mode)) {
				for (const [name, dep] of Object.entries(depGroup)) {
					if (dep.age) {
						libyears += parseAgeToYears(dep.age)
					}

					const pkg: UpdatesPackage = {
						name,
						new: dep.new,
						old: dep.old,
					}

					if (dep.age) pkg.age = dep.age
					if (dep.info) pkg.info = dep.info

					const bump = classifyBump(dep.old, dep.new)
					switch (bump) {
						case 'major': {
							major.push(pkg)
							break
						}

						case 'minor': {
							minor.push(pkg)
							break
						}

						case 'patch': {
							patch.push(pkg)
							break
						}
					}
				}
			}
		}

		return {
			libyears: Math.round(libyears * 10) / 10,
			major,
			minor,
			patch,
			total: major.length + minor.length + patch.length,
		}
	},
	// eslint-disable-next-line ts/require-await -- Synchronous check wrapped in async interface
	async isAvailable(): Promise<boolean> {
		try {
			resolveUpdatesBinary()
			return true
		} catch {
			log.warn('Failed to resolve bundled updates binary.')
			return false
		}
	},
	key: 'updates',
}
