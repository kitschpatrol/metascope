import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import spdxLicenseList from 'spdx-license-list/full.js'
import { runPrettierOnFile } from './utilities'

const CONCURRENCY = 20
const MAX_REDIRECTS = 10
const REQUEST_TIMEOUT_MS = 15_000
const SPDX_BASE_URL = 'https://spdx.org/licenses/'
const DESTINATION = './src/lib/data/license-urls.json'
const PERMANENT_REDIRECT_STATUSES = new Set([301, 308])
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

type Resolution = {
	redirected: boolean
	retainedTemporaryRedirect: boolean
	url: string
	usedFallback: boolean
}

async function fetchHeaders(url: string): Promise<Response> {
	const response = await fetch(url, {
		headers: {
			range: 'bytes=0-0',
			'User-Agent': 'metascope-license-url-audit',
		},
		redirect: 'manual',
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	})

	await response.body?.cancel()
	return response
}

/**
 * Follow permanent redirects for a source URL, stopping at the last permanent
 * destination when the next hop is temporary.
 */
export async function resolveLicenseUrl(
	spdxId: string,
	upstreamUrl?: string,
	fetchResponse: (url: string) => Promise<Response> = fetchHeaders,
): Promise<Resolution> {
	const fallback = `${SPDX_BASE_URL}${spdxId}`
	if (!upstreamUrl) {
		return {
			redirected: false,
			retainedTemporaryRedirect: false,
			url: fallback,
			usedFallback: true,
		}
	}

	let current = upstreamUrl
	let redirected = false

	for (let index = 0; index <= MAX_REDIRECTS; index++) {
		let parsed: URL
		try {
			parsed = new URL(current)
		} catch {
			return {
				redirected,
				retainedTemporaryRedirect: false,
				url: fallback,
				usedFallback: true,
			}
		}

		let response: Response
		try {
			response = await fetchResponse(parsed.href)
		} catch {
			return {
				redirected,
				retainedTemporaryRedirect: false,
				url: fallback,
				usedFallback: true,
			}
		}

		if (REDIRECT_STATUSES.has(response.status)) {
			const location = response.headers.get('location')
			if (!location) {
				return {
					redirected,
					retainedTemporaryRedirect: false,
					url: fallback,
					usedFallback: true,
				}
			}

			if (!PERMANENT_REDIRECT_STATUSES.has(response.status)) {
				return parsed.protocol === 'https:'
					? {
							redirected,
							retainedTemporaryRedirect: true,
							url: parsed.href,
							usedFallback: false,
						}
					: {
							redirected,
							retainedTemporaryRedirect: false,
							url: fallback,
							usedFallback: true,
						}
			}

			current = new URL(location, parsed).href
			redirected = true
			continue
		}

		if (response.ok && parsed.protocol === 'https:') {
			return {
				redirected,
				retainedTemporaryRedirect: false,
				url: parsed.href,
				usedFallback: false,
			}
		}

		return {
			redirected,
			retainedTemporaryRedirect: false,
			url: fallback,
			usedFallback: true,
		}
	}

	return {
		redirected,
		retainedTemporaryRedirect: false,
		url: fallback,
		usedFallback: true,
	}
}

async function updateLicenseUrls(): Promise<void> {
	const entries = Object.entries(spdxLicenseList).toSorted(([a], [b]) => a.localeCompare(b))
	const urls = new Map<string, { originalUrl?: string; url: string }>()
	let cursor = 0
	let completedCount = 0
	let redirectedCount = 0
	let retainedTemporaryRedirectCount = 0
	let fallbackCount = 0

	async function worker(): Promise<void> {
		while (cursor < entries.length) {
			const currentIndex = cursor
			cursor++

			const [spdxId, entry] = entries[currentIndex]
			const resolution = await resolveLicenseUrl(spdxId, entry.url)
			urls.set(spdxId, {
				originalUrl: entry.url,
				url: resolution.url,
			})
			redirectedCount += Number(resolution.redirected)
			retainedTemporaryRedirectCount += Number(resolution.retainedTemporaryRedirect)
			fallbackCount += Number(resolution.usedFallback)
			completedCount++

			if (completedCount % 50 === 0 || completedCount === entries.length) {
				console.log(`Resolved ${completedCount}/${entries.length} license URLs`)
			}
		}
	}

	await Promise.all(Array.from({ length: CONCURRENCY }, async () => worker()))

	const output = Object.fromEntries(entries.map(([spdxId]) => [spdxId, urls.get(spdxId)]))
	await fs.mkdir(path.dirname(DESTINATION), { recursive: true })
	await fs.writeFile(DESTINATION, `${JSON.stringify(output, undefined, 2)}\n`, 'utf8')
	await runPrettierOnFile(DESTINATION)

	console.log(
		`Wrote ${entries.length} HTTPS URLs to ${DESTINATION} (${redirectedCount} permanently normalized, ${retainedTemporaryRedirectCount} temporary redirects retained, ${fallbackCount} SPDX fallbacks)`,
	)
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
	await updateLicenseUrls()
}
