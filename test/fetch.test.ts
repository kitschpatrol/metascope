import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The fetch module keeps global pacing and rate limit breaker state, so each
// test loads a fresh copy via resetModules + dynamic import
async function loadFetchWithRetry() {
	const fetchModule = await import('../src/lib/utilities/fetch')
	return fetchModule.fetchWithRetry
}

function okResponse(): Response {
	return new Response('{}', { status: 200 })
}

function rateLimitedResponse(): Response {
	return new Response(undefined, { status: 429 })
}

describe('fetchWithRetry rate limit breaker', () => {
	let fetchMock: Mock<typeof fetch>

	beforeEach(() => {
		vi.resetModules()
		vi.useFakeTimers()
		fetchMock = vi.fn<typeof fetch>()
		vi.stubGlobal('fetch', fetchMock)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	it('returns a successful response without retrying', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(okResponse())

		const pending = fetchWithRetry('https://example.com/data')
		await vi.runAllTimersAsync()
		const response = await pending

		expect(response.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('retries a transient 429 without opening the breaker', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValueOnce(rateLimitedResponse()).mockResolvedValue(okResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		const response = await pending

		expect(response.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(2)

		// The breaker stayed closed, so the next request hits the network
		const nextPending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/bar')
		await vi.runAllTimersAsync()
		const nextResponse = await nextPending
		expect(nextResponse.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(3)
	})

	it('gives up on a host after exhausting retries on 429s', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		const response = await pending

		expect(response.status).toBe(429)
		// Initial request plus five retries
		expect(fetchMock).toHaveBeenCalledTimes(6)

		// Subsequent requests to the same host resolve immediately without
		// touching the network
		const skipped = await fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/bar')
		expect(skipped.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(6)
	})

	it('gives up early after sustained consecutive 429s across concurrent fetches', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		// Two concurrent fetches accumulate consecutive 429s host-wide, so the
		// breaker opens on the eighth 429 instead of waiting for either fetch
		// to exhaust its full retry ladder (which would take twelve requests)
		const pending = [
			fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/foo'),
			fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/bar'),
		]
		await vi.runAllTimersAsync()
		const responses = await Promise.all(pending)

		expect(responses[0]?.status).toBe(429)
		expect(responses[1]?.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(8)

		// And the host is now skipped entirely
		const skipped = await fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/baz')
		expect(skipped.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(8)
	})

	it('leaves other hosts unaffected while a breaker is open', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		await pending
		expect(fetchMock).toHaveBeenCalledTimes(6)

		fetchMock.mockResolvedValue(okResponse())
		const otherPending = fetchWithRetry('https://registry.npmjs.org/foo')
		await vi.runAllTimersAsync()
		const otherResponse = await otherPending

		expect(otherResponse.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(7)
	})

	it('probes after the cooldown and closes the breaker on success', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		await pending
		expect(fetchMock).toHaveBeenCalledTimes(6)

		// Wait out the cooldown, then the next request goes through as a probe
		await vi.advanceTimersByTimeAsync(60_000)
		fetchMock.mockResolvedValue(okResponse())
		const probePending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/bar')
		await vi.runAllTimersAsync()
		const probeResponse = await probePending
		expect(probeResponse.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(7)

		// The breaker is closed, so requests flow normally again
		const nextPending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/baz')
		await vi.runAllTimersAsync()
		const nextResponse = await nextPending
		expect(nextResponse.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(8)
	})

	it('reopens the breaker when the probe is still rate limited', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		await pending
		expect(fetchMock).toHaveBeenCalledTimes(6)

		await vi.advanceTimersByTimeAsync(60_000)

		// The probe is a single request, not a full retry cycle
		const probePending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/bar')
		await vi.runAllTimersAsync()
		const probeResponse = await probePending
		expect(probeResponse.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(7)

		// And the breaker is open again
		const skipped = await fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/baz')
		expect(skipped.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(7)
	})

	it('reopens the breaker when the probe fails with a network error', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock.mockResolvedValue(rateLimitedResponse())

		const pending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/foo')
		await vi.runAllTimersAsync()
		await pending
		expect(fetchMock).toHaveBeenCalledTimes(6)

		await vi.advanceTimersByTimeAsync(60_000)
		fetchMock.mockRejectedValue(new Error('socket hang up'))
		const probePending = fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/bar')
		await Promise.all([
			expect(probePending).rejects.toThrow('socket hang up'),
			vi.runAllTimersAsync(),
		])
		// Network errors still get the full retry cycle
		expect(fetchMock).toHaveBeenCalledTimes(12)

		// The failed probe reopened the breaker instead of leaving it stuck
		const skipped = await fetchWithRetry('https://api.npmjs.org/downloads/point/last-week/baz')
		expect(skipped.status).toBe(429)
		expect(fetchMock).toHaveBeenCalledTimes(12)
	})

	it('aborts attempts that hang past the attempt timeout and retries them', async () => {
		vi.useRealTimers()
		const fetchWithRetry = await loadFetchWithRetry()
		fetchMock
			// Simulate a stalled connection: never respond, only honor the abort
			.mockImplementationOnce(
				async (_input, init) =>
					new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener('abort', () => {
							reject(new Error('Attempt timed out'))
						})
					}),
			)
			.mockResolvedValue(okResponse())

		const response = await fetchWithRetry('https://api.npmjs.org/hang', undefined, 5, 50)
		expect(response.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('widens spacing for a host after a 429 and relaxes it after successes', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		const callTimes: number[] = []
		// eslint-disable-next-line ts/require-await -- Must match fetch's async signature
		fetchMock.mockImplementation(async () => {
			callTimes.push(Date.now())
			// First call is rate limited, everything after succeeds
			return callTimes.length === 1 ? rateLimitedResponse() : okResponse()
		})

		const first = fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/foo')
		await vi.runAllTimersAsync()
		await first

		// Two more sequential requests to the same host get the widened spacing
		const second = fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/bar')
		await vi.runAllTimersAsync()
		await second
		const third = fetchWithRetry('https://api.npmjs.org/downloads/point/last-month/baz')
		await vi.runAllTimersAsync()
		await third

		expect(callTimes).toHaveLength(4)
		const gaps = callTimes.slice(1).map((time, index) => time - (callTimes[index] ?? 0))
		// The 429 widened the 300ms minimum spacing, then successes relax it
		// back down without dropping below the minimum
		expect(gaps[1]).toBeGreaterThan(300)
		expect(gaps[2]).toBeGreaterThanOrEqual(300)
		expect(gaps[2] ?? 0).toBeLessThan(gaps[1] ?? Infinity)
	})

	it('paces hosts independently', async () => {
		const fetchWithRetry = await loadFetchWithRetry()
		const callTimes = new Map<string, number[]>()
		// eslint-disable-next-line ts/require-await -- Must match fetch's async signature
		fetchMock.mockImplementation(async (input) => {
			const { host } = new URL(input instanceof Request ? input.url : input)
			const times = callTimes.get(host) ?? []
			times.push(Date.now())
			callTimes.set(host, times)
			return okResponse()
		})

		const start = Date.now()
		const pending = [
			fetchWithRetry('https://api.npmjs.org/a'),
			fetchWithRetry('https://api.npmjs.org/b'),
			fetchWithRetry('https://api.npmjs.org/c'),
			fetchWithRetry('https://registry.npmjs.org/foo'),
		]
		await vi.runAllTimersAsync()
		await Promise.all(pending)

		// The other host starts immediately instead of queueing behind the
		// three paced api.npmjs.org requests
		const otherHostTimes = callTimes.get('registry.npmjs.org') ?? []
		expect((otherHostTimes[0] ?? Infinity) - start).toBeLessThan(300)
		const apiTimes = callTimes.get('api.npmjs.org') ?? []
		expect(apiTimes).toHaveLength(3)
		expect((apiTimes[2] ?? 0) - start).toBeGreaterThanOrEqual(600)
	})
})
