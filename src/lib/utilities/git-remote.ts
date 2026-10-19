/**
 * Shared git remote utilities.
 */

import gitUrlParse from 'git-url-parse'
import { log } from '../log'

const TRAILING_SLASHES_REGEX = /\/+$/v
const TRAILING_DOT_GIT_REGEX = /\.git$/v

/**
 * Order git config remotes with "origin" first, keeping the config order of the
 * rest.
 */
export function remotesOriginFirst<T>(remotes: Record<string, T>): T[] {
	return Object.entries(remotes)
		.toSorted(([a], [b]) => {
			if (a === 'origin') {
				return -1
			}

			return b === 'origin' ? 1 : 0
		})
		.map(([, remote]) => remote)
}

/**
 * Build a repository web URL from git config remotes, preferring the "origin"
 * remote. SSH and git protocol remotes become `https://` URLs. Credentials, SSH
 * ports, and the `.git` suffix are dropped. Local remotes and hosts without a
 * dot (like SSH config aliases) are skipped, since they don't name a public web
 * host.
 */
export function getRepositoryUrlFromConfig(
	remotes: Record<string, { url?: string }> | undefined,
): string | undefined {
	if (!remotes) {
		return undefined
	}

	for (const { url } of remotesOriginFirst(remotes)) {
		if (url === undefined || url === '') {
			continue
		}

		const repositoryUrl = toRepositoryUrl(url)
		if (repositoryUrl !== undefined) {
			return repositoryUrl
		}
	}

	return undefined
}

/**
 * Convert one git remote URL to a repository web URL, or undefined if it
 * doesn't point at a web host.
 */
function toRepositoryUrl(remoteUrl: string): string | undefined {
	let parsed: gitUrlParse.GitUrl
	try {
		parsed = gitUrlParse(remoteUrl)
	} catch (error) {
		log.debug(`Skipping git remote "${remoteUrl}" that isn't a URL: ${String(error)}`)
		return undefined
	}

	if (parsed.protocol === 'file' || !parsed.resource.includes('.')) {
		return undefined
	}

	const path = parsed.pathname
		.replace(TRAILING_SLASHES_REGEX, '')
		.replace(TRAILING_DOT_GIT_REGEX, '')
	if (path === '') {
		return undefined
	}

	const isWebRemote = parsed.protocol === 'http' || parsed.protocol === 'https'
	const scheme = parsed.protocol === 'http' ? 'http' : 'https'
	const port = isWebRemote && parsed.port !== '' ? `:${parsed.port}` : ''
	return `${scheme}://${parsed.resource}${port}${path}`
}
