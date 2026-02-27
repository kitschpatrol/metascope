/* eslint-disable ts/naming-convention */

import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type PypiData = {
	downloads180Days?: number
	downloadsDaily?: number
	downloadsMonthly?: number
	downloadsWeekly?: number
	publishDateLatest?: string
	releaseCount?: number
	sizeBytes?: number
	url?: string
	versionLatest?: string
	yanked?: boolean
	yankedReason?: string
}

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

function getPackageName(context: SourceContext): string | undefined {
	const name = context.codemeta?.name
	if (!name) return undefined
	if (Array.isArray(name)) {
		// eslint-disable-next-line ts/no-unsafe-assignment
		const first = name[0]
		return typeof first === 'string' ? first : undefined
	}

	return typeof name === 'string' ? name : undefined
}

export const pypiSource: MetadataSource<'pypi'> = {
	async extract(context: SourceContext): Promise<PypiData> {
		log.debug('Extracting PyPI metadata...')
		const name = getPackageName(context)
		if (!name) return {}

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

		if (!pypiResult) return {}

		// Find latest release upload time from urls
		const latestUploadTime = pypiResult.urls[0]?.upload_time_iso_8601

		// Find size from latest release
		const sizeBytes = pypiResult.urls[0]?.size

		const data: PypiData = {
			publishDateLatest: latestUploadTime,
			releaseCount: Object.keys(pypiResult.releases).length,
			sizeBytes,
			url: `https://pypi.org/project/${encodeURIComponent(name)}/`,
			versionLatest: pypiResult.info.version,
		}

		// Only include yanked fields when true
		if (pypiResult.info.yanked) {
			data.yanked = true
			if (pypiResult.info.yanked_reason) {
				data.yankedReason = pypiResult.info.yanked_reason
			}
		}

		if (pypistatsRecentResult) {
			data.downloadsDaily = pypistatsRecentResult.data.last_day
			data.downloadsMonthly = pypistatsRecentResult.data.last_month
			data.downloadsWeekly = pypistatsRecentResult.data.last_week
		}

		if (pypistatsOverallResult) {
			data.downloads180Days = pypistatsOverallResult.data.reduce(
				(sum, entry) => sum + entry.downloads,
				0,
			)
		}

		return data
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(resolve(context.path, 'pyproject.toml'))
		} catch {
			return false
		}

		const name = getPackageName(context)
		if (!name) return false

		try {
			const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, {
				method: 'HEAD',
			})
			return response.ok
		} catch {
			return false
		}
	},
	key: 'pypi',
}
