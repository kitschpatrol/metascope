import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { exec } from 'tinyexec'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getGitConfigs, getMatches, getTree, resetMatchCache } from '../src/lib/file-matching'
import { fileStatsSource } from '../src/lib/sources/file-stats'
import { firstOf } from '../src/lib/utilities/template-helpers'

const projectRoot = resolve('.')

async function git(cwd: string, ...gitArguments: string[]): Promise<void> {
	await exec('git', gitArguments, { nodeOptions: { cwd }, throwOnError: true })
}

describe('getTree', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should exclude git internals', async () => {
		const tree = await getTree(projectRoot, true)
		expect(tree.length).toBeGreaterThan(0)
		expect(tree.some((entry) => entry.startsWith('.git/'))).toBe(false)
	})

	it('should still include other dot directories', async () => {
		const tree = await getTree(projectRoot, true)
		expect(tree.some((entry) => entry.startsWith('.github/workflows/'))).toBe(true)
	})

	it('should exclude git internals when not respecting ignores', async () => {
		const tree = await getTree(projectRoot, false)
		expect(tree.some((entry) => entry.startsWith('.git/'))).toBe(false)
	})

	it('should no longer expose git config files to pattern matching', async () => {
		expect(await getMatches({ path: projectRoot }, ['.git/config'])).toEqual([])
	})
})

describe('getGitConfigs', () => {
	let root: string
	let nested: string
	let ignored: string

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'metascope-git-configs-'))
		nested = join(root, 'packages', 'nested')
		ignored = join(root, 'vendor', 'ignored')

		await git(root, 'init', '-q', '-b', 'main')
		await writeFile(join(root, '.gitignore'), 'vendor/\n')
		await writeFile(join(root, 'readme.md'), '# Root\n')

		await mkdir(nested, { recursive: true })
		await git(nested, 'init', '-q', '-b', 'main')
		await writeFile(join(nested, 'readme.md'), '# Nested\n')

		await mkdir(ignored, { recursive: true })
		await git(ignored, 'init', '-q', '-b', 'main')
	})

	afterAll(async () => {
		await rm(root, { force: true, recursive: true })
	})

	beforeEach(() => {
		resetMatchCache()
	})

	it('should find the root repository', async () => {
		expect(await getGitConfigs({ path: projectRoot })).toEqual([
			resolve(projectRoot, '.git/config'),
		])
	})

	it('should return nothing for a directory without a repository', async () => {
		expect(await getGitConfigs({ path: resolve('test/fixtures/_empty') })).toEqual([])
	})

	it('should only check the root when not recursive', async () => {
		expect(await getGitConfigs({ path: root, workspaces: false })).toEqual([
			join(root, '.git/config'),
		])
	})

	it('should include workspace repositories', async () => {
		expect(await getGitConfigs({ path: root, workspaces: ['packages/nested'] })).toEqual([
			join(root, '.git/config'),
			join(nested, '.git/config'),
		])
	})

	it('should find nested repositories recursively, skipping ignored paths', async () => {
		expect(await getGitConfigs({ path: root, recursive: true })).toEqual([
			join(root, '.git/config'),
			join(nested, '.git/config'),
		])
	})

	it('should find ignored nested repositories when not respecting ignores', async () => {
		expect(await getGitConfigs({ path: root, recursive: true, respectIgnored: false })).toEqual([
			join(root, '.git/config'),
			join(nested, '.git/config'),
			join(ignored, '.git/config'),
		])
	})

	it('should keep git internals out of file statistics', async () => {
		const result = firstOf(await fileStatsSource.extract({ options: { path: root } }))
		// Counts readme.md and packages/nested/readme.md. Dotfiles such as
		// .gitignore have always been excluded by the `**` pattern.
		expect(result?.data.totalFileCount).toBe(2)
		// Counts packages/nested; only directories that directly contain files
		// are counted, so packages itself is not
		expect(result?.data.totalDirectoryCount).toBe(1)
	})
})
