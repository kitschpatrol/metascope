import { resolve } from 'node:path'
import { describe, it } from 'vitest'
import { getMetadata, sourceNames } from '../src/lib/metadata'
import { runBenchmark } from './benchmarks/run-benchmark'

const projectRoot = resolve('.')
const allSourcesFixture = resolve('test/fixtures/all-sources')

describe('getMetadata - full extraction', () => {
	it('project root (offline)', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				await getMetadata({ offline: true, path: projectRoot })
			},
			{ iterations: 5, warmupIterations: 1 },
		)
	})

	it('all-sources fixture (offline)', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				await getMetadata({ offline: true, path: allSourcesFixture })
			},
			{ iterations: 5, warmupIterations: 1 },
		)
	})
})

describe('getMetadata - per source (project root)', () => {
	for (const source of sourceNames) {
		it(`source: ${source}`, async ({ bench, task }) => {
			await runBenchmark(
				{ bench, task },
				async () => {
					await getMetadata({ offline: true, path: projectRoot, sources: [source] })
				},
				{ iterations: 5, warmupIterations: 1 },
			)
		})
	}
})

describe('getMetadata - per source (all-sources fixture)', () => {
	for (const source of sourceNames) {
		it(`source: ${source}`, async ({ bench, task }) => {
			await runBenchmark(
				{ bench, task },
				async () => {
					await getMetadata({ offline: true, path: allSourcesFixture, sources: [source] })
				},
				{ iterations: 5, warmupIterations: 1 },
			)
		})
	}
})
