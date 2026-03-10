/* eslint-disable ts/no-unsafe-member-access */
/* eslint-disable ts/no-unsafe-call */
/* eslint-disable ts/no-unsafe-assignment */

import type { JsonLd, RemoteDocument } from 'jsonld/jsonld-spec'
import jsonld from 'jsonld'
import { log } from '../src/lib/log.ts'
import contextCacheJson from './data/context-cache.json' with { type: 'json' }

/**
 * Clear the loader cache.
 * Used by the caching script
 */
export function clearCache(): void {
	loaderCache.clear()
}

/**
 * Convert a URL to a cache key.
 * Exported for use by file caching script
 */
export function toCacheKey(url: string): string {
	// Strip trialing slash, strip http:// or https://
	return url
		.toLowerCase()
		.replace(/\/+$/, '')
		.replace(/^https?:\/\//, '')
}

const loaderCache = new Map<string, RemoteDocument>(
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	Object.entries(contextCacheJson) as unknown as Array<[string, RemoteDocument]>,
)

/**
 * Custom loader uses cache from data folder, and creates in-memory cache at runtime
 * Special header handling for certain URLs
 * Fixes "invalid remote context" errors
 * Certain URLs need accept headers
 * Pass into options at jsonld call sites, e.g. `jsonld.expand(doc, { documentLoader: customLoader })`
 * Alternately set globally: `jsonld.documentLoader = customLoader;`
 */
export async function customLoader(url: string): Promise<RemoteDocument> {
	let remoteDocument = loaderCache.get(toCacheKey(url))
	if (remoteDocument !== undefined) {
		log.debug(`Cache hit: ${url}`)
		return remoteDocument
	}

	if (
		url.startsWith('https://doi.org/') ||
		url.startsWith('https://w3id.org/codemeta') ||
		url.startsWith('http://w3id.org/codemeta') ||
		url.startsWith('https://raw.githubusercontent.com')
	) {
		// DOI can't handle the headers... 23
		const headers = url.startsWith('https://doi.org/')
			? undefined
			: // eslint-disable-next-line ts/naming-convention
				{ Accept: 'application/ld+json' }

		const response = await fetch(url, {
			headers,
			redirect: 'follow',
		})

		const document: JsonLd = await response.json()

		remoteDocument = {
			contextUrl: undefined,
			document,
			documentUrl: response.url,
		}
	} else {
		// Fall through to the default node loader
		// @ts-expect-error jsonld types missing
		remoteDocument = await jsonld.documentLoaders.node()(url)
	}

	if (remoteDocument === undefined) {
		throw new Error(`Failed to load document at ${url}`)
	}

	loaderCache.set(toCacheKey(url), remoteDocument)
	return remoteDocument
}
