/* eslint-disable ts/naming-convention */

import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'
import { fetchWithRetry } from '../utilities/fetch'
import { ensureArray } from '../utilities/template-helpers'
import { pythonPkgInfoSource } from './python-pkg-info'
import { pythonPyprojectTomlSource } from './python-pyproject-toml'
import { pythonSetupCfgSource } from './python-setup-cfg'
import { pythonSetupPySource } from './python-setup-py'

export type PythonPypiRegistryInfo = {
	/** Total downloads over the last 180 days. */
	downloads180Days?: number
	/** Downloads in the last day. */
	downloadsDaily?: number
	/** Downloads in the last month. */
	downloadsMonthly?: number
	/** Downloads in the last week. */
	downloadsWeekly?: number
	/** ISO 8601 date the package was last published. */
	publishDateLatest?: string
	/** Total number of releases on PyPI. */
	releaseCount?: number
	/** Size in bytes of the latest release artifact. */
	sizeBytes?: number
	/** PyPI project URL. */
	url?: string
	/** Latest published version string. */
	versionLatest?: string
	/** Whether the latest version has been yanked. */
	yanked?: boolean
	/** Reason the version was yanked, if provided. */
	yankedReason?: string
}

export type PythonPypiRegistryData = OneOrMany<SourceRecord<PythonPypiRegistryInfo>> | undefined

const pypiResponseSchema = z.object({
	info: z.object({
		version: z.string(),
		yanked: z.boolean().optional(),
		yanked_reason: z.string().nullable().optional(),
	}),
	releases: z.record(z.string(), z.array(z.unknown())),
	urls: z.array(
		z.object({
			size: z.number().optional(),
			upload_time_iso_8601: z.string().optional(),
		}),
	),
})

const pypistatsRecentSchema = z.object({
	data: z.object({
		last_day: z.number(),
		last_month: z.number(),
		last_week: z.number(),
	}),
})

const pypistatsOverallSchema = z.object({
	data: z.array(
		z.object({
			category: z.string(),
			downloads: z.number(),
		}),
	),
})

export const pythonPypiRegistrySource = defineSource<'pythonPypiRegistry'>({
	async discover(context) {
		if (context.options.offline) {
			log.debug("Skipping Python PyPI registry data source since we're in offline mode")
			return []
		}

		// Try to get package name from pyproject.toml context
		let packageNames = ensureArray(context.metadata?.pythonPyprojectToml)
			.filter(
				(value) =>
					!hasPrivateClassifier(
						value.data.project?.classifiers,
						value.data.project?.name,
						context.options.path,
					),
			)
			.map((value) => value.data.project?.name)
			.filter((value) => value !== undefined)

		// Try to get package name from setup.cfg context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonSetupCfg)
				.filter(
					(value) =>
						!hasPrivateClassifier(value.data.classifiers, value.data.name, context.options.path),
				)
				.map((value) => value.data.name)
				.filter((value) => value !== undefined)
		}

		// Try to get package name from setup.py context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonSetupPy)
				.filter(
					(value) =>
						!hasPrivateClassifier(value.data.classifiers, value.data.name, context.options.path),
				)
				.map((value) => value.data.name)
				.filter((value) => value !== undefined)
		}

		// Try to get package name from pkg-info context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonPkgInfo)
				.filter(
					(value) =>
						!hasPrivateClassifier(value.data.classifiers, value.data.name, context.options.path),
				)
				.map((value) => value.data.name)
				.filter((value) => value !== undefined)
		}

		// Fall back to extracting sources ourselves if they haven't run yet
		if (packageNames.length === 0) {
			const pythonSources = [
				'pythonPyprojectToml',
				'pythonSetupCfg',
				'pythonSetupPy',
				'pythonPkgInfo',
			] as const
			const anyCompleted = pythonSources.some((key) => context.completedSources?.has(key))

			if (!anyCompleted) {
				log.debug(
					`Missing python package names in source context metadata for ${context.options.path}, extracting them now...`,
				)

				const extraction = await pythonPyprojectTomlSource.extract(context)
				packageNames = ensureArray(extraction)
					.filter(
						(value) =>
							!hasPrivateClassifier(
								value.data.project?.classifiers,
								value.data.project?.name,
								context.options.path,
							),
					)
					.map((value) => value.data.project?.name)
					.filter((value) => value !== undefined)

				if (packageNames.length === 0) {
					const setupConfig = await pythonSetupCfgSource.extract(context)
					packageNames = ensureArray(setupConfig)
						.filter(
							(value) =>
								!hasPrivateClassifier(
									value.data.classifiers,
									value.data.name,
									context.options.path,
								),
						)
						.map((value) => value.data.name)
						.filter((value) => value !== undefined)
				}

				if (packageNames.length === 0) {
					const setupPy = await pythonSetupPySource.extract(context)
					packageNames = ensureArray(setupPy)
						.filter(
							(value) =>
								!hasPrivateClassifier(
									value.data.classifiers,
									value.data.name,
									context.options.path,
								),
						)
						.map((value) => value.data.name)
						.filter((value) => value !== undefined)
				}

				if (packageNames.length === 0) {
					const pkgInfo = await pythonPkgInfoSource.extract(context)
					packageNames = ensureArray(pkgInfo)
						.filter(
							(value) =>
								!hasPrivateClassifier(
									value.data.classifiers,
									value.data.name,
									context.options.path,
								),
						)
						.map((value) => value.data.name)
						.filter((value) => value !== undefined)
				}
			}
		}

		return packageNames
	},
	key: 'pythonPypiRegistry',
	async parse(input) {
		log.debug('Extracting PyPI metadata...')
		const name = input

		const [pypiResult, pypistatsRecentResult, pypistatsOverallResult] = await Promise.all([
			fetchJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, pypiResponseSchema),
			fetchJson(
				`https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`,
				pypistatsRecentSchema,
			),
			fetchJson(
				`https://pypistats.org/api/packages/${encodeURIComponent(name)}/overall?mirrors=false`,
				pypistatsOverallSchema,
			),
		])

		if (!pypiResult) {
			return
		}

		// Find latest release upload time from urls
		const latestUploadTime = pypiResult.urls[0]?.upload_time_iso_8601

		// Find size from latest release
		const sizeBytes = pypiResult.urls[0]?.size

		const info: PythonPypiRegistryInfo = {
			publishDateLatest: latestUploadTime,
			releaseCount: Object.keys(pypiResult.releases).length,
			sizeBytes,
			url: `https://pypi.org/project/${encodeURIComponent(name)}/`,
			versionLatest: pypiResult.info.version,
		}

		// Only include yanked fields when true
		if (pypiResult.info.yanked) {
			info.yanked = true
			const yankedReason = pypiResult.info.yanked_reason
			if (yankedReason !== null && yankedReason !== undefined && yankedReason !== '') {
				info.yankedReason = yankedReason
			}
		}

		if (pypistatsRecentResult) {
			info.downloadsDaily = pypistatsRecentResult.data.last_day
			info.downloadsMonthly = pypistatsRecentResult.data.last_month
			info.downloadsWeekly = pypistatsRecentResult.data.last_week
		}

		if (pypistatsOverallResult) {
			const downloads180Days = pypistatsOverallResult.data.reduce(
				(sum, entry) => sum + entry.downloads,
				0,
			)
			info.downloads180Days =
				downloads180Days === 0 || Number.isNaN(downloads180Days) ? undefined : downloads180Days
		}

		return {
			data: info,
			source: `https://pypi.org/project/${encodeURIComponent(name)}/`,
		}
	},
	phase: 2,
})

// Helpers -----------------------

/**
 * Fetch a URL and parse its JSON body with a Zod schema. Returns undefined when
 * the request fails, the response is not OK, or the body doesn't validate.
 */
async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T | undefined> {
	try {
		const response = await fetchWithRetry(url)
		if (!response.ok) {
			return undefined
		}

		return schema.parse(await response.json())
	} catch {
		return undefined
	}
}

/**
 * Check if classifiers contain a "Private ::" prefix, which signals that the
 * package is not intended for publication on PyPI. PyPI itself rejects uploads
 * with this classifier.
 */
function hasPrivateClassifier(
	classifiers: string[] | undefined,
	packageName: string | undefined,
	path: string,
): boolean {
	const isPrivate = classifiers?.some((c) => c.startsWith('Private :: ')) ?? false
	if (isPrivate) {
		log.debug(
			`Skipping PyPI registry lookup for "${packageName}" in "${path}" because it has a "Private ::" classifier`,
		)
	}

	return isPrivate
}
