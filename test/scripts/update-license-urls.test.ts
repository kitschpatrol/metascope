import { describe, expect, it, vi } from 'vitest'
import { resolveLicenseUrl } from '../../scripts/update-license-urls'

describe('resolveLicenseUrl', () => {
	it('retains the destination of the final permanent redirect before a temporary redirect', async () => {
		const fetchResponse = vi.fn<(url: string) => Promise<Response>>()
		fetchResponse
			.mockResolvedValueOnce(redirect(301, '/b'))
			.mockResolvedValueOnce(redirect(308, '/c'))
			.mockResolvedValueOnce(redirect(301, '/d'))
			.mockResolvedValueOnce(redirect(302, '/e'))

		const result = await resolveLicenseUrl('Example', 'https://example.test/a', fetchResponse)

		expect(fetchResponse.mock.calls.map(([url]) => url)).toEqual([
			'https://example.test/a',
			'https://example.test/b',
			'https://example.test/c',
			'https://example.test/d',
		])
		expect(result).toEqual({
			redirected: true,
			retainedTemporaryRedirect: true,
			url: 'https://example.test/d',
			usedFallback: false,
		})
	})
})

function redirect(status: number, location: string): Response {
	return new Response(undefined, { headers: { location }, status })
}
