/* eslint-disable ts/naming-convention */

import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'

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

export type PythonPypiRegistryData = SourceRecord<PythonPypiRegistryInfo> | undefined

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

async function getPackageName(context: SourceContext): Promise<string | undefined> {
	// Try pyproject.toml [project].name
	try {
		const content = await readFile(resolve(context.path, 'pyproject.toml'), 'utf8')
		const nameMatch = /^\s*name\s*=\s*"([^"]+)"/m.exec(content)
		if (nameMatch?.[1]) return nameMatch[1]
	} catch {
		// No pyproject.toml
	}

	// Try setup.cfg [metadata].name
	try {
		const content = await readFile(resolve(context.path, 'setup.cfg'), 'utf8')
		const nameMatch = /^\s*name\s*=\s*(\S+)$/m.exec(content)
		if (nameMatch?.[1]?.trim()) return nameMatch[1].trim()
	} catch {
		// No setup.cfg
	}

	return undefined
}

export const pythonPypiRegistrySource: MetadataSource<'pythonPypiRegistry'> = {
	async extract(context: SourceContext): Promise<PythonPypiRegistryData> {
		log.debug('Extracting PyPI metadata...')
		const name = await getPackageName(context)
		if (!name) return undefined

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

		if (!pypiResult) return undefined

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
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			await access(resolve(context.path, 'pyproject.toml'))
		} catch {
			return false
		}

		const name = await getPackageName(context)
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
	key: 'pythonPypiRegistry',
}
