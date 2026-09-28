/* eslint-disable unicorn/no-null */

import { http, HttpResponse, passthrough } from 'msw'
import { githubActionsRuns, githubGraphql, githubRest } from './fixtures/github'
import { npmDownloads, npmPackages } from './fixtures/npm'
import { obsidianPluginStats } from './fixtures/obsidian'
import { pypiPackages, pypistatsOverall, pypistatsRecent } from './fixtures/pypi'

function shouldMock(): boolean {
	return process.env.METASCOPE_TEST_MOCK !== 'false'
}

export const handlers = [
	// ── PyPI ──────────────────────────────────────────────────

	http.get('https://pypi.org/pypi/:name/json', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const fixture = pypiPackages[params.name as string]
		return fixture === undefined
			? new HttpResponse(null, { status: 404 })
			: HttpResponse.json(fixture)
	}),

	http.get('https://pypistats.org/api/packages/:name/recent', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const fixture = pypistatsRecent[params.name as string]
		return fixture === undefined
			? new HttpResponse(null, { status: 404 })
			: HttpResponse.json(fixture)
	}),

	http.get('https://pypistats.org/api/packages/:name/overall', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const fixture = pypistatsOverall[params.name as string]
		return fixture === undefined
			? new HttpResponse(null, { status: 404 })
			: HttpResponse.json(fixture)
	}),

	// ── npm ───────────────────────────────────────────────────

	http.get('https://registry.npmjs.org/:name', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const fixture = npmPackages[params.name as string]
		return fixture === undefined
			? new HttpResponse(null, { status: 404 })
			: HttpResponse.json(fixture)
	}),

	http.get('https://api.npmjs.org/downloads/point/:period/:name', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const downloads = npmDownloads[params.name as string]

		return downloads === undefined
			? new HttpResponse(null, { status: 404 })
			: HttpResponse.json({ downloads })
	}),

	// ── Obsidian ──────────────────────────────────────────────

	http.get(
		'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json',
		() => (shouldMock() ? HttpResponse.json(obsidianPluginStats) : passthrough()),
	),

	// ── GitHub ────────────────────────────────────────────────

	http.post('https://api.github.com/graphql', async ({ request }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		const body = (await request.json()) as { variables?: { owner?: string; repo?: string } }
		const key = `${body.variables?.owner}/${body.variables?.repo}`
		const fixture = githubGraphql[key]
		return fixture === undefined
			? HttpResponse.json({ errors: [{ message: 'Not Found' }] }, { status: 200 })
			: HttpResponse.json({ data: fixture })
	}),

	http.get('https://api.github.com/repos/:owner/:repo/actions/runs', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		// eslint-disable-next-line ts/restrict-template-expressions
		const key = `${params.owner}/${params.repo}`

		const fixture = githubActionsRuns[key]

		return fixture ? HttpResponse.json(fixture) : new HttpResponse(null, { status: 404 })
	}),

	http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
		if (!shouldMock()) {
			return passthrough()
		}

		// eslint-disable-next-line ts/restrict-template-expressions
		const key = `${params.owner}/${params.repo}`
		const fixture = githubRest[key]

		return fixture ? HttpResponse.json(fixture) : new HttpResponse(null, { status: 404 })
	}),
]
