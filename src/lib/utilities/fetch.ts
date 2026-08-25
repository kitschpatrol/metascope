import { log } from '../log'

// Pace request starts per host so parallel sources (e.g. every workspace
// package in a monorepo fetching several download periods at once) can't flood
// rate-limited APIs like api.npmjs.org into 429 storms. Requests may overlap
// in flight; only their start times are spaced. Every 429 doubles the host's
// spacing (up to a cap) and successes gradually relax it back toward the
// minimum, so pacing adapts to whatever limit the host is enforcing without
// slowing down other hosts.
const MIN_FETCH_INTERVAL_MS = 300
const MAX_FETCH_INTERVAL_MS = 5000
type HostPacing = {
	chain: Promise<void>
	consecutive429s: number
	interval: number
	lastFetchStart: number
}
const hostPacing = new Map<string, HostPacing>()

// A host that answers this many requests in a row with 429 and no successes is
// in a hard penalty window — open its breaker right away instead of letting
// every in-flight fetch grind through its full retry ladder first
const MAX_CONSECUTIVE_429S = 8

// Abort attempts that hang without a response — rate-limiting CDNs sometimes
// stall penalized IPs (accept the connection, never respond), and Node's
// default headers timeout of 5 minutes reads as a frozen process
const ATTEMPT_TIMEOUT_MS = 15_000

// Once a host keeps returning 429 through an entire retry cycle, further
// requests to it are answered with a synthetic 429 instead of hitting the
// network, so large batch runs degrade to missing data rather than stalling
// for minutes. One probe request per cooldown notices when the limit lifts.
const RATE_LIMIT_COOLDOWN_MS = 60_000
type RateLimitedHost = {
	isProbing: boolean
	openedUntil: number
}
const rateLimitedHosts = new Map<string, RateLimitedHost>()

function getHostPacing(host = ''): HostPacing {
	let pacing = hostPacing.get(host)
	if (pacing === undefined) {
		pacing = {
			chain: Promise.resolve(),
			consecutive429s: 0,
			interval: MIN_FETCH_INTERVAL_MS,
			lastFetchStart: 0,
		}
		hostPacing.set(host, pacing)
	}

	return pacing
}

async function waitForFetchTurn(pacing: HostPacing): Promise<void> {
	const previous = pacing.chain
	const turn = (async () => {
		await previous
		const wait = pacing.lastFetchStart + pacing.interval - Date.now()
		if (wait > 0) {
			await sleep(wait)
		}

		pacing.lastFetchStart = Date.now()
	})()
	pacing.chain = turn
	return turn
}

function adaptHostPacing(pacing: HostPacing, response: Response): void {
	if (response.status === 429) {
		pacing.consecutive429s += 1
		pacing.interval = Math.min(pacing.interval * 2, MAX_FETCH_INTERVAL_MS)
	} else {
		pacing.consecutive429s = 0
		pacing.interval = Math.max(Math.round(pacing.interval * 0.9), MIN_FETCH_INTERVAL_MS)
	}
}

// A 429 means giving up when it lands on the recovery probe, exhausts the
// final retry, or caps a sustained run of consecutive 429s from the host
function isRateLimitGiveUp(
	pacing: HostPacing,
	isProbe: boolean,
	attempt: number,
	maxRetries: number,
): boolean {
	return isProbe || attempt === maxRetries || pacing.consecutive429s >= MAX_CONSECUTIVE_429S
}

/**
 * Fetch with automatic retries and exponential backoff. Retries on network
 * errors, timed-out attempts, and 429/5xx responses. Request starts are paced
 * per host to stay under per-IP rate limits, and the pacing adapts: each 429
 * widens the host's spacing, successes relax it. When a host keeps rate
 * limiting through a full retry cycle, subsequent requests to it resolve
 * immediately with a synthetic 429 response until a periodic probe finds the
 * host healthy again.
 */
export async function fetchWithRetry(
	url: string,
	options?: RequestInit,
	maxRetries = 5,
	attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
): Promise<Response> {
	const host = getHost(url)
	const pacing = getHostPacing(host)
	let isProbe = false
	let lastError: unknown

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const gate = isProbe ? 'proceed' : checkRateLimitBreaker(url, host)
		if (gate === 'skip') {
			return syntheticRateLimitResponse()
		}

		if (gate === 'probe') {
			isProbe = true
		}

		try {
			await waitForFetchTurn(pacing)
			const response = await fetch(url, {
				...options,
				signal: getAttemptSignal(options, attemptTimeoutMs),
			})

			adaptHostPacing(pacing, response)

			if (
				host !== undefined &&
				response.status === 429 &&
				isRateLimitGiveUp(pacing, isProbe, attempt, maxRetries)
			) {
				openRateLimitBreaker(host)
				return response
			}

			if (host !== undefined && isProbe) {
				closeRateLimitBreaker(host)
				isProbe = false
			}

			if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
				discardResponseBody(response)
				const delay = getDelay(attempt, response)
				log.warn(
					`Fetch ${url} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
				)
				await sleep(delay)
				continue
			}

			return response
		} catch (error) {
			lastError = error
			if (attempt < maxRetries) {
				const delay = getDelay(attempt)
				log.warn(
					`Fetch ${url} failed: ${error instanceof Error ? error.message : String(error)}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
				)
				await sleep(delay)
			}
		}
	}

	// A probe that exhausted its retries on errors must reopen the breaker
	// rather than leave it stuck half-open, blocking all future requests
	if (isProbe && host !== undefined) {
		openRateLimitBreaker(host)
	}

	throw lastError
}

/**
 * Decide how a request should interact with its host's rate limit breaker:
 * proceed normally, go through as the single recovery probe, or skip the
 * network entirely because the breaker is open.
 */
function checkRateLimitBreaker(
	url: string,
	host: string | undefined,
): 'probe' | 'proceed' | 'skip' {
	if (host === undefined) {
		return 'proceed'
	}

	const rateLimited = rateLimitedHosts.get(host)
	if (rateLimited === undefined) {
		return 'proceed'
	}

	if (rateLimited.isProbing || Date.now() < rateLimited.openedUntil) {
		log.debug(`Skipping fetch ${url} while ${host} is rate limited`)
		return 'skip'
	}

	// Cooldown elapsed, let this request through as the probe
	rateLimited.isProbing = true
	return 'probe'
}

function getHost(url: string): string | undefined {
	try {
		return new URL(url).host
	} catch {
		return undefined
	}
}

function openRateLimitBreaker(host: string): void {
	const isReopening = rateLimitedHosts.has(host)
	rateLimitedHosts.set(host, {
		isProbing: false,
		openedUntil: Date.now() + RATE_LIMIT_COOLDOWN_MS,
	})
	getHostPacing(host).consecutive429s = 0
	if (!isReopening) {
		log.warn(
			`Host ${host} is persistently rate limiting, giving up on requests to it and probing again every ${RATE_LIMIT_COOLDOWN_MS / 1000}s`,
		)
	}
}

function closeRateLimitBreaker(host: string): void {
	if (rateLimitedHosts.delete(host)) {
		log.warn(`Host ${host} is no longer rate limiting, resuming requests`)
	}
}

function syntheticRateLimitResponse(): Response {
	return new Response(undefined, { status: 429, statusText: 'Too Many Requests' })
}

function getAttemptSignal(options: RequestInit | undefined, timeoutMs: number): AbortSignal {
	const timeoutSignal = AbortSignal.timeout(timeoutMs)
	return options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal
}

/**
 * Cancel an unread response body so its connection returns to the pool. Leaked
 * bodies pin sockets, and enough of them can hit the server's per-IP connection
 * limit and starve all future requests.
 */
export function discardResponseBody(response: Response): void {
	void response.body?.cancel().catch((error: unknown) => {
		log.debug(
			`Failed to discard response body: ${error instanceof Error ? error.message : String(error)}`,
		)
	})
}

function getDelay(attempt: number, response?: Response): number {
	const backoff = 1000 * 2 ** attempt

	// Respect Retry-After header if present, but never go below the backoff
	const retryAfter = response?.headers.get('retry-after')
	if (retryAfter !== null && retryAfter !== undefined && retryAfter !== '') {
		const seconds = Number(retryAfter)
		if (!Number.isNaN(seconds)) {
			return Math.max(seconds * 1000, backoff)
		}
	}

	return backoff
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}
