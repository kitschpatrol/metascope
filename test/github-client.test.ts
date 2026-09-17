/* eslint-disable ts/naming-convention -- GitHub response fields use snake_case. */
/* eslint-disable ts/require-await -- Fetch mocks return promises without real I/O. */

import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const repo = { owner: 'test', repo: 'example' }

describe('GitHub client', () => {
	let fetchMock: Mock<typeof fetch>

	beforeEach(() => {
		vi.resetModules()
		// Leave Bottleneck's housekeeping intervals on real timers.
		vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
		fetchMock = vi.fn<typeof fetch>()
		vi.stubGlobal('fetch', fetchMock)
		vi.spyOn(console, 'warn').mockImplementation(() => {
			// Expected rate limit warnings are covered by the retry assertions.
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it.each([undefined, '', 'test-token'])(
		'supports REST and GraphQL with token %s',
		async (token) => {
			const { createGitHubClient } = await import('../src/lib/utilities/github-client')
			const client = createGitHubClient(token)
			fetchMock
				.mockResolvedValueOnce(Response.json({ has_pages: true }))
				.mockResolvedValueOnce(Response.json({ data: { repository: { name: 'example' } } }))

			const restResult = client.request('GET /repos/{owner}/{repo}', repo)
			await vi.runAllTimersAsync()
			await expect(restResult).resolves.toMatchObject({ data: { has_pages: true } })

			const query =
				'query($owner: String!, $repo: String!) { repository(owner: $owner, name: $repo) { name } }'
			const graphqlResult = client.graphql(query, repo)
			await vi.runAllTimersAsync()
			await expect(graphqlResult).resolves.toEqual({ repository: { name: 'example' } })

			expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
				'https://api.github.com/repos/test/example',
				'https://api.github.com/graphql',
			])
			for (const [, options] of fetchMock.mock.calls) {
				expect(new Headers(options?.headers).get('authorization') ?? undefined).toBe(
					token !== undefined && token !== '' ? `token ${token}` : undefined,
				)
			}
		},
	)

	it('retries a transient server failure', async () => {
		const { createGitHubClient } = await import('../src/lib/utilities/github-client')
		fetchMock
			.mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
			.mockResolvedValueOnce(Response.json({ has_pages: true }))

		const result = createGitHubClient().request('GET /repos/{owner}/{repo}', repo)
		await vi.runAllTimersAsync()
		await expect(result).resolves.toMatchObject({ data: { has_pages: true } })
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it.each([401, 403, 404])('does not retry an ordinary HTTP %s error', async (status) => {
		const { createGitHubClient } = await import('../src/lib/utilities/github-client')
		fetchMock.mockImplementation(async () => Response.json({ message: 'Forbidden' }, { status }))

		const result = createGitHubClient().request('GET /repos/{owner}/{repo}', repo)
		await Promise.all([expect(result).rejects.toMatchObject({ status }), vi.runAllTimersAsync()])
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it.each(['primary', 'secondary'])(
		'retries a persistent %s rate limit only once',
		async (kind) => {
			const { createGitHubClient } = await import('../src/lib/utilities/github-client')
			fetchMock.mockImplementation(async () =>
				Response.json(
					{
						message:
							kind === 'primary'
								? 'API rate limit exceeded'
								: 'You have exceeded a secondary rate limit.',
					},
					{
						headers:
							kind === 'primary'
								? {
										'x-ratelimit-remaining': '0',
										'x-ratelimit-reset': String(Math.ceil(Date.now() / 1000) + 1),
									}
								: { 'retry-after': '1' },
						status: 403,
					},
				),
			)

			const result = createGitHubClient().request('GET /repos/{owner}/{repo}', repo)
			await Promise.all([
				expect(result).rejects.toMatchObject({ status: 403 }),
				vi.runAllTimersAsync(),
			])
			expect(fetchMock).toHaveBeenCalledTimes(2)
		},
	)
})
