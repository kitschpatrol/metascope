import { log } from '../log'

/**
 * Fetch with automatic retries and exponential backoff.
 * Retries on network errors and 429/5xx responses.
 */
export async function fetchWithRetry(
	url: string,
	options?: RequestInit,
	maxRetries = 5,
): Promise<Response> {
	let lastError: unknown

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, options)

			if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
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

	throw lastError
}

function getDelay(attempt: number, response?: Response): number {
	const backoff = 1000 * 2 ** attempt

	// Respect Retry-After header if present, but never go below the backoff
	const retryAfter = response?.headers.get('retry-after')
	if (retryAfter) {
		const seconds = Number(retryAfter)
		if (!Number.isNaN(seconds)) return Math.max(seconds * 1000, backoff)
	}

	return backoff
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}
