import { coerce, diff } from 'semver'
import { updates } from 'updates'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'

const AGE_VALUE_UNIT_REGEX = /^(\d+)\s+(\w+)$/v

type DependencyUpdatesPackage = {
	/** Human-readable age of the update (e.g. "3 months"). */
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
 * Parse an age string from the `updates` CLI (via the `timerel` library) into
 * fractional years.
 *
 * Possible formats: "now", "<n> sec(s)", "<n> min(s)", "<n> hour(s)", "<n>
 * day(s)", "<n> week(s)", "<n> month(s)", "<n> year(s)"
 */
function parseAgeToYears(age: string): number {
	if (age === 'now') {
		return 0
	}

	const match = AGE_VALUE_UNIT_REGEX.exec(age.trim())
	if (!match) {
		return 0
	}

	const value = Number(match[1])
	const unit = match[2]
	if (unit === undefined) {
		return 0
	}

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
