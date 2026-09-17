import { resolve } from 'node:path'
import { describe, it } from 'vitest'
import type { TemplateName } from '../src/lib/templates'
import { getMetadata } from '../src/lib/metadata'
import { templates } from '../src/lib/templates'
import { runBenchmark } from './benchmarks/run-benchmark'

const projectRoot = resolve('.')
const allSourcesFixture = resolve('test/fixtures/all-sources')

const templateNames = Object.keys(templates) as TemplateName[]

describe('getMetadata - per template (project root)', () => {
	for (const template of templateNames) {
		it(`template: ${template}`, async ({ bench, task }) => {
			await runBenchmark(
				{ bench, task },
				async () => {
					await getMetadata({ offline: true, path: projectRoot, template })
				},
				{ iterations: 5, warmupIterations: 1 },
			)
		})
	}
})

describe('getMetadata - per template (all-sources fixture)', () => {
	for (const template of templateNames) {
		it(`template: ${template}`, async ({ bench, task }) => {
			await runBenchmark(
				{ bench, task },
				async () => {
					await getMetadata({ offline: true, path: allSourcesFixture, template })
				},
				{ iterations: 5, warmupIterations: 1 },
			)
		})
	}
})
