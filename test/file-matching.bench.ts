import { resolve } from 'node:path'
import { bench, describe } from 'vitest'
import { getMatches, getTree, resetMatchCache } from '../src/lib/file-matching'

const projectRoot = resolve('.')
const allSourcesFixture = resolve('test/fixtures/all-sources')
const workspacesFixture = resolve('test/fixtures/workspaces')

describe('getTree', () => {
	bench(
		'cold scan of project root',
		async () => {
			resetMatchCache()
			await getTree(projectRoot, true)
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'cold scan of project root (no gitignore)',
		async () => {
			resetMatchCache()
			await getTree(projectRoot, false)
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'cached scan of project root',
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

	bench(
		'cold scan of fixture directory',
		async () => {
			resetMatchCache()
			await getTree(allSourcesFixture, true)
		},
		{ iterations: 50, warmupIterations: 5 },
	)
})

describe('getMatches - single pattern', () => {
	bench(
		'cold match package.json in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot }, ['package.json'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'cached match package.json in project root',
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

describe('getMatches - wildcard patterns', () => {
	bench(
		'cold match *.json in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot, recursive: true }, ['*.json'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'cold match *.ts in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot, recursive: true }, ['*.ts'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'cold match *.{ts,js,json} in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot, recursive: true }, ['*.{ts,js,json}'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)
})

describe('getMatches - multiple patterns', () => {
	bench(
		'cold match many file types simultaneously',
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

describe('getMatches - recursive vs non-recursive', () => {
	bench(
		'non-recursive match in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot, recursive: false }, ['package.json'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)

	bench(
		'recursive match in project root',
		async () => {
			resetMatchCache()
			await getMatches({ path: projectRoot, recursive: true }, ['package.json'])
		},
		{ iterations: 10, warmupIterations: 1 },
	)
})

describe('getMatches - workspaces', () => {
	bench(
		'cold match with workspace discovery',
		async () => {
			resetMatchCache()
			await getMatches({ path: workspacesFixture, workspaces: true }, ['package.json'])
		},
		{ iterations: 20, warmupIterations: 2 },
	)

	bench(
		'cold match with manual workspaces',
		async () => {
			resetMatchCache()
			await getMatches(
				{ path: workspacesFixture, workspaces: ['packages/pkg-a', 'packages/pkg-b'] },
				['package.json'],
			)
		},
		{ iterations: 20, warmupIterations: 2 },
	)

	bench(
		'cold match without workspaces',
		async () => {
			resetMatchCache()
			await getMatches({ path: workspacesFixture, workspaces: false }, ['package.json'])
		},
		{ iterations: 20, warmupIterations: 2 },
	)
})

describe('getMatches - repeated calls (cache effectiveness)', () => {
	bench(
		'10 sequential pattern matches on cached tree',
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
