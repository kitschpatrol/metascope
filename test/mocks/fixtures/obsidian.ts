/**
 * Minimal Obsidian community plugin stats fixture. Conforms to
 * pluginStatsSchema in src/lib/sources/obsidian-plugin-registry.ts:
 * z.record(z.string(), z.record(z.string(), z.number()))
 */

export const obsidianPluginStats: Record<string, Record<string, number>> = {
	'all-sources-plugin': {
		downloads: 1234,
	},
}
