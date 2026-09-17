import { resolve } from 'node:path'
import { describe, it } from 'vitest'
import { getMatches, getTree, resetMatchCache } from '../src/lib/file-matching'
import { runBenchmark } from './benchmarks/run-benchmark'

const projectRoot = resolve('.')
const allSourcesFixture = resolve('test/fixtures/all-sources')
const workspacesFixture = resolve('test/fixtures/workspaces')

describe('getTree', () => {
	it('cold scan of project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getTree(projectRoot, true)
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('cold scan of project root (no gitignore)', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getTree(projectRoot, false)
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('cached scan of project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				await getTree(projectRoot, true)
			},
			{
				iterations: 100,
				setup() {
					resetMatchCache()
				},
				warmupIterations: 1,
			},
		)
	})

	it('cold scan of fixture directory', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getTree(allSourcesFixture, true)
			},
			{ iterations: 50, warmupIterations: 5 },
		)
	})
})

describe('getMatches - single pattern', () => {
	it('cold match package.json in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot }, ['package.json'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('cached match package.json in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				await getMatches({ path: projectRoot }, ['package.json'])
			},
			{
				iterations: 100,
				setup() {
					resetMatchCache()
				},
				warmupIterations: 1,
			},
		)
	})
})

describe('getMatches - wildcard patterns', () => {
	it('cold match *.json in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: true }, ['*.json'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('cold match *.ts in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: true }, ['*.ts'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('cold match *.{ts,js,json} in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: true }, ['*.{ts,js,json}'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})
})

describe('getMatches - multiple patterns', () => {
	it('cold match many file types simultaneously', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: true }, [
					'package.json',
					'*.gemspec',
					'Cargo.toml',
					'go.mod',
					'pyproject.toml',
					'setup.py',
					'setup.cfg',
					'pom.xml',
					'*.pbxproj',
					'library.properties',
					'publiccode.yml',
					'addon_config.mk',
					'Info.plist',
					'codemeta.json',
					'manifest.json',
				])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})
})

describe('getMatches - recursive vs non-recursive', () => {
	it('non-recursive match in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: false }, ['package.json'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})

	it('recursive match in project root', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: projectRoot, recursive: true }, ['package.json'])
			},
			{ iterations: 10, warmupIterations: 1 },
		)
	})
})

describe('getMatches - workspaces', () => {
	it('cold match with workspace discovery', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: workspacesFixture, workspaces: true }, ['package.json'])
			},
			{ iterations: 20, warmupIterations: 2 },
		)
	})

	it('cold match with manual workspaces', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches(
					{ path: workspacesFixture, workspaces: ['packages/pkg-a', 'packages/pkg-b'] },
					['package.json'],
				)
			},
			{ iterations: 20, warmupIterations: 2 },
		)
	})

	it('cold match without workspaces', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				resetMatchCache()
				await getMatches({ path: workspacesFixture, workspaces: false }, ['package.json'])
			},
			{ iterations: 20, warmupIterations: 2 },
		)
	})
})

describe('getMatches - repeated calls (cache effectiveness)', () => {
	it('10 sequential pattern matches on cached tree', async ({ bench, task }) => {
		await runBenchmark(
			{ bench, task },
			async () => {
				const patterns = [
					['package.json'],
					['*.ts'],
					['*.json'],
					['*.toml'],
					['*.yml'],
					['*.xml'],
					['*.md'],
					['*.js'],
					['*.yaml'],
					['*.cfg'],
				]
				for (const pattern of patterns) {
					await getMatches({ path: projectRoot, recursive: true }, pattern)
				}
			},
			{
				iterations: 20,
				setup() {
					resetMatchCache()
				},
				warmupIterations: 1,
			},
		)
	})
})
