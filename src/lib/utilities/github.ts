/**
 * Shared GitHub utilities used across multiple sources.
 */

import gitUrlParse from 'git-url-parse'
import { remotesOriginFirst } from './git-remote'

/**
 * Extract a GitHub owner/repo from git config remote URLs. Prefers the "origin"
 * remote, falls back to the first GitHub remote found.
 */
export function getGitHubRemoteFromConfig(
	remotes: Record<string, { url?: string }> | undefined,
): undefined | { owner: string; repo: string } {
	if (!remotes) {
		return undefined
	}

	for (const { url } of remotesOriginFirst(remotes)) {
		if (url === undefined || url === '') {
			continue
		}

		try {
			const parsed = gitUrlParse(url)
			if (parsed.source === 'github.com' && parsed.owner !== '' && parsed.name !== '') {
				return { owner: parsed.owner, repo: parsed.name }
			}
		} catch {
			// Skip unparsable URLs
		}
	}

	return undefined
}
