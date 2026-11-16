/* eslint-disable ts/naming-convention -- GitHub response fields use snake_case. */

import { http, HttpResponse } from 'msw'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { githubSource } from '../../src/lib/sources/github'
import { githubActionsSource } from '../../src/lib/sources/github-actions'
import { ensureArray, firstOf } from '../../src/lib/utilities/template-helpers'
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
					'https://api.github.com/repos/kitschpatrol/metascope/actions/workflows/:workflow/runs',
					({ params, request }) => {
						const { searchParams } = new URL(request.url)
						expect(searchParams.get('branch')).toBe('release/v1')
						expect(searchParams.get('per_page')).toBe('1')
						expect(params.workflow).toBe('ci.yml')
						expect(searchParams.get('status')).toBe('completed')
						expect(searchParams.has('head_sha')).toBe(false)
						return HttpResponse.json({
							total_count: 1,
							workflow_runs: [githubActionsRuns['kitschpatrol/metascope']!.workflow_runs[0]],
						})
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
				lastRunSha: 'a'.repeat(40),
				lastRunUrl: 'https://github.com/kitschpatrol/metascope/actions/runs/12345',
				name: 'CI',
			})
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})
	it('retains each workflow latest run SHA together with its outcome and URL', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'metascope-github-actions-'))
		try {
			await mkdir(join(directory, '.github/workflows'), { recursive: true })
			await writeFile(join(directory, '.github/workflows/ci.yml'), 'name: CI\non: push\n')
			await writeFile(join(directory, '.github/workflows/release.yml'), 'name: Release\non: push\n')
			await writeFile(
				join(directory, '.github/workflows/untested.yml'),
				'name: Untested\non: push\n',
			)
			const fixture = githubActionsRuns['kitschpatrol/metascope']!.workflow_runs[0]!
			const runs = [
				{
					...fixture,
					conclusion: 'failure',
					head_sha: 'b'.repeat(40),
					html_url: 'https://github.com/kitschpatrol/metascope/actions/runs/2',
				},
				...Array.from({ length: 100 }, () => ({
					...fixture,
					path: '.github/workflows/remote-only.yml',
				})),
				{
					...fixture,
					head_sha: 'c'.repeat(40),
					html_url: 'https://github.com/kitschpatrol/metascope/actions/runs/3',
					path: '.github/workflows/release.yml',
				},
				fixture,
			]
			const requestedWorkflows: string[] = []
			server.use(
				http.get(
					'https://api.github.com/repos/kitschpatrol/metascope/actions/workflows/:workflow/runs',
					({ params, request }) => {
						const workflow = String(params.workflow)
						requestedWorkflows.push(workflow)
						const { searchParams } = new URL(request.url)
						expect(searchParams.get('per_page')).toBe('1')
						expect(searchParams.get('branch')).toBe('main')
						expect(searchParams.get('status')).toBe('completed')
						const matchingRuns = runs.filter((run) => run.path.endsWith(`/${workflow}`))
						return HttpResponse.json({
							total_count: matchingRuns.length,
							workflow_runs: matchingRuns.slice(0, 1),
						})
					},
				),
			)
			const result = ensureArray(
				await githubActionsSource.extract({
					metadata: {
						gitConfig: {
							data: { remote: { origin: { url: 'https://github.com/kitschpatrol/metascope' } } },
							source: '.git/config',
						},
					},
					options: { path: directory },
				}),
			)
			expect(requestedWorkflows.toSorted()).toEqual(['ci.yml', 'release.yml', 'untested.yml'])
			expect(result.map((record) => record.data.name).toSorted()).toEqual([
				'CI',
				'Release',
				'Untested',
			])
			expect(result.find((record) => record.data.name === 'CI')?.data).toMatchObject({
				lastRunConclusion: 'failure',
				lastRunSha: 'b'.repeat(40),
				lastRunUrl: 'https://github.com/kitschpatrol/metascope/actions/runs/2',
			})
			expect(result.find((record) => record.data.name === 'Release')?.data).toMatchObject({
				lastRunConclusion: 'success',
				lastRunSha: 'c'.repeat(40),
				lastRunUrl: 'https://github.com/kitschpatrol/metascope/actions/runs/3',
			})
			expect(
				result.find((record) => record.data.name === 'Untested')?.data.lastRunSha,
			).toBeUndefined()
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})

	it('keeps another workflow run available when one workflow endpoint fails', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'metascope-github-actions-'))
		try {
			await mkdir(join(directory, '.github/workflows'), { recursive: true })
			await writeFile(join(directory, '.github/workflows/ci.yml'), 'name: CI\non: push\n')
			await writeFile(join(directory, '.github/workflows/release.yml'), 'name: Release\non: push\n')
			const fixture = githubActionsRuns['kitschpatrol/metascope']!.workflow_runs[0]!
			server.use(
				http.get(
					'https://api.github.com/repos/kitschpatrol/metascope/actions/workflows/:workflow/runs',
					({ params }) => {
						if (params.workflow === 'ci.yml') {
							return new HttpResponse(undefined, { status: 404 })
						}

						expect(params.workflow).toBe('release.yml')
						return HttpResponse.json({
							total_count: 1,
							workflow_runs: [{ ...fixture, path: '.github/workflows/release.yml' }],
						})
					},
				),
			)
			const result = ensureArray(
				await githubActionsSource.extract({
					metadata: {
						gitConfig: {
							data: { remote: { origin: { url: 'https://github.com/kitschpatrol/metascope' } } },
							source: '.git/config',
						},
					},
					options: { path: directory },
				}),
			)
			expect(result).toHaveLength(2)
			expect(result.find((record) => record.data.name === 'CI')?.data.lastRunSha).toBeUndefined()
			expect(result.find((record) => record.data.name === 'Release')?.data).toMatchObject({
				lastRunConclusion: 'success',
				lastRunSha: 'a'.repeat(40),
				lastRunUrl: fixture.html_url,
			})
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})

	it('keeps workflow run metadata unavailable offline without making requests', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'metascope-github-actions-'))
		let requests = 0
		try {
			await mkdir(join(directory, '.github/workflows'), { recursive: true })
			await writeFile(join(directory, '.github/workflows/ci.yml'), 'name: CI\non: push\n')
			server.use(
				http.get('https://api.github.com/*', () => {
					requests++
					return new HttpResponse(undefined, { status: 500 })
				}),
			)
			const result = firstOf(
				await githubActionsSource.extract({ options: { offline: true, path: directory } }),
			)
			expect(result?.data.name).toBe('CI')
			expect(result?.data.lastRunSha).toBeUndefined()
			expect(result?.data.lastRunConclusion).toBeUndefined()
			expect(requests).toBe(0)
		} finally {
			await rm(directory, { force: true, recursive: true })
		}
	})
})
