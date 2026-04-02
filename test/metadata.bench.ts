import { resolve } from 'node:path'
import { bench, describe } from 'vitest'
import { getMetadata, sourceNames } from '../src/lib/metadata'

const projectRoot = resolve('.')
const allSourcesFixture = resolve('test/fixtures/all-sources')

describe('getMetadata - full extraction', () => {
	bench(
		'project root (offline)',
		async () => {
			await getMetadata({ offline: true, path: projectRoot })
		},
		{ iterations: 5, warmupIterations: 1 },
	)

	bench(
		'all-sources fixture (offline)',
		async () => {
			await getMetadata({ offline: true, path: allSourcesFixture })
		},
		{ iterations: 5, warmupIterations: 1 },
	)
})

describe('getMetadata - per source (project root)', () => {
	for (const source of sourceNames) {
		bench(
			source,
			async () => {
				await getMetadata({ offline: true, path: projectRoot, sources: [source] })
			},
			{ iterations: 5, warmupIterations: 1 },
		)
	}
})

describe('getMetadata - per source (all-sources fixture)', () => {
	for (const source of sourceNames) {
		bench(
			source,
			async () => {
				await getMetadata({ offline: true, path: allSourcesFixture, sources: [source] })
			},
			{ iterations: 5, warmupIterations: 1 },
		)
	}
})
