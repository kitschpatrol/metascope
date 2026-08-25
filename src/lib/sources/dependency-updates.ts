import { coerce, diff } from 'semver'
import { updates } from 'updates'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'

const AGE_VALUE_UNIT_REGEX = /^(\d+)([a-z]+)$/v

/**
 * Fractional years per `timerel` short unit. Note that `m` is minutes and `mo`
 * is months.
 */
const AGE_UNIT_YEARS: Record<string, number> = {
	d: 1 / 365.25,
	h: 1 / (365.25 * 24),
	m: 1 / (365.25 * 24 * 60),
	mo: 1 / 12,
	s: 1 / (365.25 * 24 * 60 * 60),
	w: 7 / 365.25,
	y: 1,
}

type DependencyUpdatesPackage = {
	/** Human-readable age of the update (e.g. "3mo"). */
	age?: string
	/** Additional info about the update (e.g. deprecation notice). */
	info?: string
	/** Package name. */
	name: string
	/** Latest available version. */
	new: string
	/** Currently installed version. */
	old: string
}

type DependencyUpdatesFields = {
	/** Packages with available major version updates. */
	major?: DependencyUpdatesPackage[]
	/** Packages with available minor version updates. */
	minor?: DependencyUpdatesPackage[]
	/** Packages with available patch version updates. */
	patch?: DependencyUpdatesPackage[]
}

type DependencyUpdatesExtra = {
	/** Total dependency staleness in libyears. */
	libyears?: number
	/** Total number of outdated packages. */
	total?: number
}

export type DependencyUpdatesData =
	OneOrMany<SourceRecord<DependencyUpdatesFields, DependencyUpdatesExtra>> | undefined

const dependencySchema = z.object({
	age: z.string().optional(),
	info: z.string().optional(),
	new: z.string(),
	old: z.string(),
})

const updatesOutputSchema = z.object({
	results: z.record(z.string(), z.record(z.string(), z.record(z.string(), dependencySchema))),
})

/**
 * Parse an age string from the `updates` library (via the `timerel` library)
 * into fractional years.
 *
 * As of updates v18 the age column uses short units. Possible formats: "now",
 * "<n>s", "<n>m", "<n>h", "<n>d", "<n>w", "<n>mo", "<n>y"
 */
export function parseAgeToYears(age: string): number {
	if (age === 'now') {
		return 0
	}

	const match = AGE_VALUE_UNIT_REGEX.exec(age.trim())
	const unitYears = match?.[2] === undefined ? undefined : AGE_UNIT_YEARS[match[2]]
	if (match === null || unitYears === undefined) {
		log.debug(`Ignoring unrecognized dependency age "${age}" in libyears calculation.`)
		return 0
	}

	return Number(match[1]) * unitYears
}

/**
 * Classify a version bump as major, minor, or patch using semver. Falls back to
 * 'major' for non-semver versions (e.g. GitHub Actions tags).
 */
function classifyBump(oldVersion: string, newVersion: string): 'major' | 'minor' | 'patch' {
	const oldSemver = coerce(oldVersion)
	const newSemver = coerce(newVersion)
	if (!oldSemver || !newSemver) {
		return 'major'
	}

	const result = diff(oldSemver, newSemver)
	if (result === null) {
		return 'major'
	}

	if (result === 'premajor' || result.startsWith('major')) {
		return 'major'
	}

	if (result === 'preminor' || result.startsWith('minor')) {
		return 'minor'
	}

	return 'patch'
}

type UpdatesDependency = z.infer<typeof dependencySchema>

type DependencyBuckets = Record<'major' | 'minor' | 'patch', DependencyUpdatesPackage[]>

/**
 * Classify each dependency in a group into the appropriate bucket, skipping
 * `@types/node` and packages already seen. Returns the libyears contributed by
 * this group.
 */
function collectDependencyUpdates(
	dependencyGroup: Record<string, UpdatesDependency>,
	buckets: DependencyBuckets,
	seen: Set<string>,
): number {
	let libyears = 0

	for (const [name, dependency] of Object.entries(dependencyGroup)) {
		if (name === '@types/node' || seen.has(name)) {
			continue
		}

		seen.add(name)

		if (dependency.age !== undefined && dependency.age !== '') {
			libyears += parseAgeToYears(dependency.age)
		}

		const packageStatus: DependencyUpdatesPackage = {
			name,
			new: dependency.new,
			old: dependency.old,
		}

		if (dependency.age !== undefined && dependency.age !== '') {
			packageStatus.age = dependency.age
		}

		if (dependency.info !== undefined && dependency.info !== '') {
			packageStatus.info = dependency.info
		}

		const bump = classifyBump(dependency.old, dependency.new)
		buckets[bump].push(packageStatus)
	}

	return libyears
}

export const dependencyUpdatesSource = defineSource<'dependencyUpdates'>({
	// eslint-disable-next-line ts/require-await
	async discover(context) {
		return [context.options.path]
	},
	key: 'dependencyUpdates',
	async parse(input) {
		log.debug('Extracting dependency update information via updates...')

		// Thanks to @silverwind for implementing the API version of this tool
		// https://github.com/silverwind/updates/issues/122
		const result = await updates({
			files: [input],
			json: true,
		})

		let parsed: z.infer<typeof updatesOutputSchema>
		try {
			parsed = updatesOutputSchema.parse(result)
		} catch {
			log.debug('No dependency files found for updates analysis.')
			return
		}

		const buckets: DependencyBuckets = { major: [], minor: [], patch: [] }
		const seen = new Set<string>()
		let libyears = 0

		for (const mode of Object.values(parsed.results)) {
			for (const dependencyGroup of Object.values(mode)) {
				libyears += collectDependencyUpdates(dependencyGroup, buckets, seen)
			}
		}

		const { major, minor, patch } = buckets

		return {
			data: {
				major,
				minor,
				patch,
			},
			extra: {
				libyears: Math.round(libyears * 10) / 10,
				total: major.length + minor.length + patch.length,
			},
			source: input,
		}
	},
	phase: 1,
})
