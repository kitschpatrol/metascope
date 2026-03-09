import { isAbsolute, resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { getMetadata } from '../src/lib/metadata'
import { firstOf, getMatches, getWorkspaces, resetMatchCache } from '../src/lib/sources/source'

const fixturesDirectory = resolve('test/fixtures/workspaces')

describe('getWorkspaces', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should return empty array when disabled', () => {
		expect(getWorkspaces(fixturesDirectory, false)).toEqual([])
	})

	it('should auto-discover workspaces as absolute paths', () => {
		const locations = getWorkspaces(fixturesDirectory, true)
		expect(locations).toHaveLength(2)
		for (const location of locations) {
			expect(isAbsolute(location)).toBe(true)
			expect(location).toContain('packages/pkg-')
		}
	})

	it('should not include the root directory in auto-discovered workspaces', () => {
		const locations = getWorkspaces(fixturesDirectory, true)
		expect(locations).not.toContain(fixturesDirectory)
	})

	it('should return memoized results on repeated calls', () => {
		const first = getWorkspaces(fixturesDirectory, true)
		const second = getWorkspaces(fixturesDirectory, true)
		expect(first).toBe(second)
	})

	it('should return validated manual list as absolute paths', () => {
		const locations = getWorkspaces(fixturesDirectory, ['packages/pkg-a', 'packages/pkg-b'])
		expect(locations).toEqual([
			resolve(fixturesDirectory, 'packages/pkg-a'),
			resolve(fixturesDirectory, 'packages/pkg-b'),
		])
	})

	it('should skip non-existent manual paths', () => {
		const locations = getWorkspaces(fixturesDirectory, [
			'packages/pkg-a',
			'packages/does-not-exist',
		])
		expect(locations).toEqual([resolve(fixturesDirectory, 'packages/pkg-a')])
	})

	it('should skip duplicate manual paths', () => {
		const locations = getWorkspaces(fixturesDirectory, ['packages/pkg-a', 'packages/pkg-a'])
		expect(locations).toEqual([resolve(fixturesDirectory, 'packages/pkg-a')])
	})

	it('should skip paths that escape the directory', () => {
		const locations = getWorkspaces(fixturesDirectory, ['../../package.json'])
		expect(locations).toEqual([])
	})

	it('should skip non-string values', () => {
		// eslint-disable-next-line ts/no-unsafe-argument, ts/no-explicit-any
		const locations = getWorkspaces(fixturesDirectory, [42, '', 'packages/pkg-a'] as any)
		expect(locations).toEqual([resolve(fixturesDirectory, 'packages/pkg-a')])
	})
})

describe('getMatches with workspaces', () => {
	beforeEach(() => {
		resetMatchCache()
	})

	it('should include workspace matches as absolute paths', async () => {
		const matches = await getMatches(
			{ path: fixturesDirectory, workspaces: ['packages/pkg-a', 'packages/pkg-b'] },
			['package.json'],
		)
		expect(matches).toContain(resolve(fixturesDirectory, 'package.json'))
		expect(matches).toContain(resolve(fixturesDirectory, 'packages/pkg-a/package.json'))
		expect(matches).toContain(resolve(fixturesDirectory, 'packages/pkg-b/package.json'))
	})

	it('should not include workspace matches when workspaces is false', async () => {
		const matches = await getMatches(
			{ path: fixturesDirectory, workspaces: false },
			['package.json'],
		)
		expect(matches).toEqual([resolve(fixturesDirectory, 'package.json')])
	})

	it('should deduplicate results', async () => {
		const matches = await getMatches(
			{ path: fixturesDirectory, recursive: true, workspaces: true },
			['package.json'],
		)
		const unique = new Set(matches)
		expect(matches).toHaveLength(unique.size)
	})

	it('should sort results alphabetically then by depth', async () => {
		const matches = await getMatches(
			{ path: fixturesDirectory, workspaces: ['packages/pkg-a', 'packages/pkg-b'] },
			['package.json'],
		)
		const sorted = [...matches].sort(
			(a, b) => a.localeCompare(b) || a.split('/').length - b.split('/').length,
		)
		expect(matches).toEqual(sorted)
	})
})

describe('getMetadata with absolute flag', () => {
	it('should return absolute source paths by default', async () => {
		const result = await getMetadata({ path: '.', workspaces: false })
		const source = firstOf(result.nodePackageJson)?.source
		expect(source).toBeDefined()
		expect(isAbsolute(source!)).toBe(true)
		expect(source).toContain('package.json')
	})

	it('should return relative source paths when absolute is false', async () => {
		const result = await getMetadata({ absolute: false, path: '.', workspaces: false })
		const source = firstOf(result.nodePackageJson)?.source
		expect(source).toBeDefined()
		expect(isAbsolute(source!)).toBe(false)
	})

	it('should resolve metascope path to absolute by default', async () => {
		const result = await getMetadata({ path: '.', workspaces: false })
		expect(result.metascope).toBeDefined()
		expect(isAbsolute(result.metascope!.data.options.path)).toBe(true)
	})

	it('should return absolute workspace directories by default', async () => {
		const result = await getMetadata({
			path: 'test/fixtures/workspaces',
			workspaces: true,
		})
		expect(result.metascope).toBeDefined()
		expect(result.metascope!.data.workspaceDirectories.length).toBeGreaterThan(0)
		for (const dir of result.metascope!.data.workspaceDirectories) {
			expect(isAbsolute(dir)).toBe(true)
		}
	})

	it('should return relative workspace directories when absolute is false', async () => {
		const result = await getMetadata({
			absolute: false,
			path: 'test/fixtures/workspaces',
			workspaces: true,
		})
		expect(result.metascope).toBeDefined()
		for (const dir of result.metascope!.data.workspaceDirectories) {
			expect(isAbsolute(dir)).toBe(false)
		}
	})
})
