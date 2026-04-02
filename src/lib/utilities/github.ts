/**
 * Shared GitHub utilities used across multiple sources.
 */

import gitUrlParse from 'git-url-parse'

/**
 * Extract a GitHub owner/repo from git config remote URLs.
 * Prefers the "origin" remote, falls back to the first GitHub remote found.
 */
export function getGitHubRemoteFromConfig(
	remotes: Record<string, { url?: string }> | undefined,
): undefined | { owner: string; repo: string } {
	if (!remotes) return undefined

	// Prefer "origin" remote, fall back to first GitHub remote
	const sorted = Object.entries(remotes).toSorted(([a], [b]) => {
		if (a === 'origin') return -1
		if (b === 'origin') return 1
		return 0
	})

	for (const [, remote] of sorted) {
		const { url } = remote
		if (!url) continue
		try {
			const parsed = gitUrlParse(url)
			if (parsed.source === 'github.com' && parsed.owner && parsed.name) {
				return { owner: parsed.owner, repo: parsed.name }
			}
		} catch {
			// Skip unparsable URLs
		}
	}

	return undefined
}
