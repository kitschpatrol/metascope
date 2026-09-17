import { Octokit } from '@octokit/core'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

// Preserve the umbrella client's retries and its single retry for each kind
// of rate limit, without loading its REST helpers, pagination, or app APIs.
// eslint-disable-next-line ts/naming-convention -- The plugin API returns a constructor.
const GitHubOctokit = Octokit.plugin(retry, throttling).defaults({
	throttle: {
		onRateLimit(retryAfter, options, octokit, retryCount) {
			octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
			if (retryCount === 0) {
				octokit.log.info(`Retrying after ${retryAfter} seconds!`)
				return true
			}

			return false
		},
		onSecondaryRateLimit(retryAfter, options, octokit, retryCount) {
			octokit.log.warn(`SecondaryRateLimit detected for request ${options.method} ${options.url}`)
			if (retryCount === 0) {
				octokit.log.info(`Retrying after ${retryAfter} seconds!`)
				return true
			}

			return false
		},
	},
})

/** Create a REST and GraphQL client with optional token authentication. */
export function createGitHubClient(githubToken?: string): Octokit {
	return new GitHubOctokit(
		githubToken !== undefined && githubToken !== '' ? { auth: githubToken } : undefined,
	)
}
