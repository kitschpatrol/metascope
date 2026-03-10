/* eslint-disable ts/naming-convention */

import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source'
import { log } from '../log'
import { defineSource } from '../source'
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
		let packageNames = []

		// Try to get package name from pyproject.toml context
		packageNames = ensureArray(context.metadata?.pythonPyprojectToml)
			.map((value) => value.data.project?.name)
			.filter((value) => value !== undefined)

		// Try to get package name from setup.cfg context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonSetupCfg)
				.map((value) => value.data.name)
				.filter((value) => value !== undefined)
		}

		// Try to get package name from setup.py context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonSetupPy)
				.map((value) => value.data.name)
				.filter((value) => value !== undefined)
		}

		// Try to get package name from pkg-info context
		if (packageNames.length === 0) {
			packageNames = ensureArray(context.metadata?.pythonPkgInfo)
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
				log.warn(
					`Missing python package names in source context metadata for ${context.options.path}, extracting them now...`,
				)

				const extraction = await pythonPyprojectTomlSource.extract(context)
				packageNames = ensureArray(extraction)
					.map((value) => value.data.project?.name)
					.filter((value) => value !== undefined)

				if (packageNames.length === 0) {
					const setupCfg = await pythonSetupCfgSource.extract(context)
					packageNames = ensureArray(setupCfg)
						.map((value) => value.data.name)
						.filter((value) => value !== undefined)
				}

				if (packageNames.length === 0) {
					const setupPy = await pythonSetupPySource.extract(context)
					packageNames = ensureArray(setupPy)
						.map((value) => value.data.name)
						.filter((value) => value !== undefined)
				}

				if (packageNames.length === 0) {
					const pkgInfo = await pythonPkgInfoSource.extract(context)
					packageNames = ensureArray(pkgInfo)
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
			fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)
				.then(async (response) => {
					if (!response.ok) return
					return pypiResponseSchema.parse(await response.json())
				})
				.catch((): undefined => undefined),
			fetch(`https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`)
				.then(async (response) => {
					if (!response.ok) return
					return pypistatsRecentSchema.parse(await response.json())
				})
				.catch((): undefined => undefined),
			fetch(`https://pypistats.org/api/packages/${encodeURIComponent(name)}/overall?mirrors=false`)
				.then(async (response) => {
					if (!response.ok) return
					return pypistatsOverallSchema.parse(await response.json())
				})
				.catch((): undefined => undefined),
		])

		if (!pypiResult) return

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
			if (pypiResult.info.yanked_reason) {
				info.yankedReason = pypiResult.info.yanked_reason
			}
		}

		if (pypistatsRecentResult) {
			info.downloadsDaily = pypistatsRecentResult.data.last_day
			info.downloadsMonthly = pypistatsRecentResult.data.last_month
			info.downloadsWeekly = pypistatsRecentResult.data.last_week
		}

		if (pypistatsOverallResult) {
			info.downloads180Days =
				pypistatsOverallResult.data.reduce((sum, entry) => sum + entry.downloads, 0) || undefined
		}

		return {
			data: info,
			source: `https://pypi.org/project/${encodeURIComponent(name)}/`,
		}
	},
	phase: 2,
})
