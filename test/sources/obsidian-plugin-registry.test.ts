import { http, HttpResponse } from 'msw'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SourceContext } from '../../src/lib/source'
import { obsidianPluginRegistrySource } from '../../src/lib/sources/obsidian-plugin-registry'
import { ensureArray } from '../../src/lib/utilities/template-helpers'
import { obsidianPluginStats } from '../mocks/fixtures/obsidian'
import { server } from '../mocks/server'

const statsUrl =
	'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json'

function manifest(id: string) {
	return { data: { id }, source: `${id}/manifest.json` }
}

function contextFor(...pluginIds: string[]): SourceContext {
	return {
		completedSources: new Set(['obsidianPluginManifestJson']),
		metadata: { obsidianPluginManifestJson: pluginIds.map((id) => manifest(id)) },
		options: { path: resolve('.') },
	}
}

describe('Obsidian plugin registry source', () => {
	it('should download the community stats once for every plugin in an extraction', async () => {
		let requestCount = 0
		server.use(
			http.get(statsUrl, () => {
				requestCount++
				return HttpResponse.json({ ...obsidianPluginStats, 'second-plugin': { downloads: 42 } })
			}),
		)

		const results = ensureArray(
			await obsidianPluginRegistrySource.extract(contextFor('all-sources-plugin', 'second-plugin')),
		)

		expect(results.map((result) => result.data.downloadCount)).toEqual([1234, 42])
		expect(requestCount).toBe(1)
	})

	it('should download the stats again for a separate extraction', async () => {
		let requestCount = 0
		server.use(
			http.get(statsUrl, () => {
				requestCount++
				return HttpResponse.json(obsidianPluginStats)
			}),
		)

		await obsidianPluginRegistrySource.extract(contextFor('all-sources-plugin'))
		await obsidianPluginRegistrySource.extract(contextFor('all-sources-plugin'))
		expect(requestCount).toBe(2)
	})

	it('should still report the plugin URL when the stats are unavailable', async () => {
		server.use(http.get(statsUrl, () => new HttpResponse(undefined, { status: 404 })))

		const results = ensureArray(
			await obsidianPluginRegistrySource.extract(contextFor('all-sources-plugin')),
		)

		expect(results).toHaveLength(1)
		expect(results[0]?.data.downloadCount).toBeUndefined()
		expect(results[0]?.data.url).toBe('https://obsidian.md/plugins?id=all-sources-plugin')
	})
})
