/* eslint-disable ts/naming-convention -- GitHub response fields use snake_case. */

import { http, HttpResponse } from 'msw'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { githubSource } from '../../src/lib/sources/github'
import { githubActionsSource } from '../../src/lib/sources/github-actions'
import { firstOf } from '../../src/lib/utilities/template-helpers'
import { githubActionsRuns, githubGraphql } from '../mocks/fixtures/github'
import { server } from '../mocks/server'

describe('GitHub API sources', () => {
	it('combines GraphQL repository data with REST Pages detection', async () => {
		server.use(
			http.get('https://api.github.com/repos/kitschpatrol/metascope', () =>
				HttpResponse.json({ has_pages: true }),
			),
		)

		const result = await githubSource.parse('kitschpatrol/metascope', {
			options: { path: resolve('.') },
		})

		expect(result?.data).toMatchObject({ defaultBranch: 'main', hasPages: true, name: 'metascope' })
	})

	it('compares fork branches containing slashes', async () => {
		const fixture = structuredClone(githubGraphql['kitschpatrol/metascope']) as {
			repository: Record<string, unknown>
		}
		Object.assign(fixture.repository, {
			defaultBranchRef: { name: 'feature/example' },
			isFork: true,
			parent: {
				defaultBranchRef: { name: 'release/v1' },
				name: 'metascope',
				nameWithOwner: 'upstream/metascope',
				owner: { login: 'upstream' },
				url: 'https://github.com/upstream/metascope',
			},
		})
		server.use(
			http.post('https://api.github.com/graphql', () => HttpResponse.json({ data: fixture })),
			http.get(
				'https://api.github.com/repos/kitschpatrol/metascope/compare/:basehead',
				({ params }) => {
					expect(params.basehead).toBe('upstream:release/v1...kitschpatrol:feature/example')
					return HttpResponse.json({ ahead_by: 3, behind_by: 2 })
				},
			),
		)

		const result = await githubSource.parse('kitschpatrol/metascope', {
			options: { path: resolve('.') },
		})

		expect(result?.data).toMatchObject({ commitsAheadUpstream: 3, commitsBehindUpstream: 2 })
	})

	it('fetches the default branch and the latest completed workflow runs', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'metascope-github-actions-'))
		try {
			await mkdir(join(directory, '.github/workflows'), { recursive: true })
			await writeFile(join(directory, '.github/workflows/ci.yml'), 'name: CI\non: push\n')
			server.use(
				http.get('https://api.github.com/repos/kitschpatrol/metascope', () =>
					HttpResponse.json({ default_branch: 'release/v1' }),
				),
				http.get(
					'https://api.github.com/repos/kitschpatrol/metascope/actions/runs',
					({ request }) => {
						const { searchParams } = new URL(request.url)
						expect(searchParams.get('branch')).toBe('release/v1')
						expect(searchParams.get('per_page')).toBe('100')
						expect(searchParams.get('status')).toBe('completed')
						return HttpResponse.json(githubActionsRuns['kitschpatrol/metascope'])
					},
				),
			)

			const result = await githubActionsSource.extract({
				metadata: {
					gitConfig: {
						data: { remote: { origin: { url: 'https://github.com/kitschpatrol/metascope' } } },
						source: '.git/config',
					},
				},
				options: { path: directory },
			})

			expect(firstOf(result)?.data).toMatchObject({
				lastRunConclusion: 'success',
				lastRunDurationMs: 330_000,
				lastRunUrl: 'https://github.com/kitschpatrol/metascope/actions/runs/12345',
				name: 'CI',
			})
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})
})
