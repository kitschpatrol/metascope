import { mkdir, mkdtemp, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, sep } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { exec } from 'tinyexec'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { RemoteRepository } from '../src/lib/remote-repository'
import { getMetadata } from '../src/lib/metadata'
import {
	checkoutRemoteRepository,
	getDefaultCacheDirectory,
	isRemoteRepositoryUrl,
	parseRemoteRepository,
} from '../src/lib/remote-repository'
import { firstOf } from '../src/lib/utilities/template-helpers'

// @case-police-ignore github

const GIT_IDENTITY = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com']
const MISSING_PATH_REGEX = /does not include a repository path/v
const NOT_CACHED_REGEX = /not cached/v
const NO_CACHE_OFFLINE_REGEX = /offline mode with caching disabled/v
const UNKNOWN_REF_REGEX = /Could not find a branch, tag, or commit/v

async function git(cwd: string, ...arguments_: string[]): Promise<string> {
	const { stdout } = await exec('git', [...GIT_IDENTITY, ...arguments_], {
		nodeOptions: { cwd },
		throwOnError: true,
	})
	return stdout.trim()
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path)
		return true
	} catch {
		return false
	}
}

/** Temporary clone directories created by `cache: false`, for leak checks. */
async function temporaryCloneDirectories(): Promise<string[]> {
	const entries = await readdir(tmpdir())
	return entries.filter((entry) => entry.startsWith('metascope-clone-')).toSorted()
}

function lockPathFor(cacheDirectory: string, remote: RemoteRepository): string {
	return `${join(cacheDirectory, 'locks', ...remote.cacheKey)}.lock`
}

function parse(input: string): RemoteRepository {
	const parsed = parseRemoteRepository(input)
	if (parsed === undefined) {
		throw new Error(`Expected "${input}" to parse as a remote repository`)
	}

	return parsed
}

// ─── URL Parsing ────────────────────────────────────────────────────

describe('parseRemoteRepository', () => {
	const cases: Array<{
		expected: Partial<RemoteRepository>
		input: string
		name: string
	}> = [
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'https://github.com/kitschpatrol/metascope',
				ref: undefined,
				subdirectory: undefined,
			},
			input: 'https://github.com/kitschpatrol/metascope',
			name: 'plain https URL',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'https://github.com/kitschpatrol/metascope.git',
			},
			input: 'https://github.com/kitschpatrol/metascope.git',
			name: 'https URL with .git suffix',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'https://github.com/kitschpatrol/metascope.git',
			},
			input: 'git+https://github.com/kitschpatrol/metascope.git',
			name: 'git+https URL loses the git+ prefix',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'git@github.com:kitschpatrol/metascope.git',
			},
			input: 'git@github.com:kitschpatrol/metascope.git',
			name: 'scp-style address',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'ssh://git@github.com/kitschpatrol/metascope.git',
			},
			input: 'ssh://git@github.com/kitschpatrol/metascope.git',
			name: 'ssh URL',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'git://github.com/kitschpatrol/metascope.git',
			},
			input: 'git://github.com/kitschpatrol/metascope.git',
			name: 'git protocol URL',
		},
		{
			expected: {
				cacheKey: ['local', 'tmp', 'foo', 'bar'],
				cloneUrl: 'file:///tmp/foo/bar.git',
			},
			input: 'file:///tmp/foo/bar.git',
			name: 'file URL',
		},
		{
			expected: {
				cloneUrl: 'https://github.com/kitschpatrol/metascope',
				ref: 'v1.0.0',
				subdirectory: undefined,
			},
			input: 'https://github.com/kitschpatrol/metascope#v1.0.0',
			name: 'https URL with ref fragment',
		},
		{
			expected: {
				cloneUrl: 'git@github.com:kitschpatrol/metascope.git',
				ref: 'feature/x',
			},
			input: 'git@github.com:kitschpatrol/metascope.git#feature/x',
			name: 'scp-style address with slashed ref fragment',
		},
		{
			expected: {
				cloneUrl: 'https://github.com/kitschpatrol/metascope',
				ref: 'main',
				subdirectory: 'src/lib',
			},
			input: 'https://github.com/kitschpatrol/metascope/tree/main/src/lib',
			name: 'GitHub tree URL',
		},
		{
			expected: {
				cloneUrl: 'https://github.com/kitschpatrol/metascope',
				ref: 'main',
				subdirectory: 'readme.md',
			},
			input: 'https://github.com/kitschpatrol/metascope/blob/main/readme.md',
			name: 'GitHub blob URL',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'https://github.com/kitschpatrol/metascope.git',
				ref: 'abc123',
			},
			input: 'https://github.com/kitschpatrol/metascope/commit/abc123',
			name: 'GitHub commit URL',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
				cloneUrl: 'https://github.com/kitschpatrol/metascope.git',
				ref: 'v1.0.0',
			},
			input: 'https://github.com/kitschpatrol/metascope/releases/tag/v1.0.0',
			name: 'GitHub release tag URL',
		},
		{
			expected: {
				cacheKey: ['gitlab.com', 'group', 'sub', 'repo'],
				cloneUrl: 'https://gitlab.com/group/sub/repo.git',
			},
			input: 'https://gitlab.com/group/sub/repo.git',
			name: 'GitLab nested group URL',
		},
		{
			expected: {
				cacheKey: ['example.com_8443', 'path', 'to', 'repo'],
				cloneUrl: 'https://example.com:8443/path/to/repo.git',
			},
			input: 'https://example.com:8443/path/to/repo.git',
			name: 'URL with a port',
		},
		{
			expected: {
				cacheKey: ['github.com', 'kitschpatrol', 'metascope'],
			},
			input: 'https://github.com/Kitschpatrol/Metascope/',
			name: 'mixed case URL with trailing slash',
		},
		{
			expected: {
				cacheKey: ['gitlab.com', 'g', 'r'],
				cloneUrl: 'https://oauth2:tok@gitlab.com/g/r.git',
			},
			input: 'https://oauth2:tok@gitlab.com/g/r.git',
			name: 'URL with credentials',
		},
		{
			expected: {
				cloneUrl: 'https://github.com/kitschpatrol/metascope',
				href: '  https://github.com/kitschpatrol/metascope  ',
			},
			input: '  https://github.com/kitschpatrol/metascope  ',
			name: 'URL with surrounding whitespace',
		},
	]

	it.each(cases)('should parse $name', ({ expected, input }) => {
		expect(isRemoteRepositoryUrl(input)).toBe(true)
		const parsed = parse(input)
		expect(parsed.href).toBe(input)
		expect(parsed).toMatchObject(expected)
	})

	it.each([
		'.',
		'./relative',
		'/abs/path',
		'kitschpatrol/metascope',
		'github:kitschpatrol/metascope',
		String.raw`C:\Users\foo`,
		'',
	])('should not treat "%s" as remote', (input) => {
		expect(isRemoteRepositoryUrl(input)).toBe(false)
		expect(parseRemoteRepository(input)).toBeUndefined()
	})

	it('should throw on a URL without a repository path', () => {
		expect(() => parseRemoteRepository('https://github.com/')).toThrow(MISSING_PATH_REGEX)
	})
})

describe('getDefaultCacheDirectory', () => {
	it('should return an absolute platform cache path', () => {
		const directory = getDefaultCacheDirectory()
		const expectedTail = process.platform === 'win32' ? ['metascope', 'Cache'] : ['metascope']
		expect(isAbsolute(directory)).toBe(true)
		expect(directory.split(sep).slice(-expectedTail.length)).toEqual(expectedTail)
	})
})

// ─── Checkout ───────────────────────────────────────────────────────

describe('checkoutRemoteRepository', { timeout: 30_000 }, () => {
	let sourceDirectory: string
	let cacheDirectory: string
	let url: string
	let remote: RemoteRepository
	let commit1: string
	let commit2: string
	let commit3: string
	let featureCommit: string
	const temporaryDirectories: string[] = []

	async function makeTemporaryDirectory(prefix: string): Promise<string> {
		const directory = await mkdtemp(join(tmpdir(), prefix))
		temporaryDirectories.push(directory)
		return directory
	}

	async function commitFile(path: string, content: string, message: string): Promise<string> {
		await mkdir(dirname(join(sourceDirectory, path)), { recursive: true })
		await writeFile(join(sourceDirectory, path), content)
		await git(sourceDirectory, 'add', path)
		await git(sourceDirectory, 'commit', '-q', '-m', message)
		return git(sourceDirectory, 'rev-parse', 'HEAD')
	}

	beforeAll(async () => {
		sourceDirectory = await makeTemporaryDirectory('metascope-remote-source-')
		cacheDirectory = await makeTemporaryDirectory('metascope-remote-cache-')

		await git(sourceDirectory, 'init', '-q', '-b', 'main')
		await git(sourceDirectory, 'config', 'uploadpack.allowFilter', 'true')

		await mkdir(join(sourceDirectory, 'packages/sub'), { recursive: true })
		await writeFile(
			join(sourceDirectory, 'package.json'),
			JSON.stringify({ name: 'remote-fixture', version: '1.0.0' }, undefined, 2),
		)
		await writeFile(
			join(sourceDirectory, 'packages/sub/package.json'),
			JSON.stringify({ name: 'remote-fixture-sub', version: '1.0.0' }, undefined, 2),
		)
		await git(sourceDirectory, 'add', '.')
		await git(sourceDirectory, 'commit', '-q', '-m', 'Initial commit')
		commit1 = await git(sourceDirectory, 'rev-parse', 'HEAD')
		await git(sourceDirectory, 'tag', 'v1.0.0')

		commit2 = await commitFile('readme.md', '# Remote fixture\n', 'Add readme')

		await git(sourceDirectory, 'checkout', '-q', '-b', 'feature')
		featureCommit = await commitFile('feature.txt', 'feature\n', 'Add feature file')
		await git(sourceDirectory, 'checkout', '-q', 'main')

		url = pathToFileURL(sourceDirectory).href
		remote = parse(url)
	})

	afterAll(async () => {
		for (const directory of temporaryDirectories) {
			await rm(directory, { force: true, recursive: true })
		}
	})

	it('should clone a fresh repository into the cache', async () => {
		const lease = await checkoutRemoteRepository(remote, { cacheDirectory })
		try {
			const gitDirectoryStat = await stat(join(lease.repositoryPath, '.git'))
			expect(gitDirectoryStat.isDirectory()).toBe(true)
			expect(lease.path).toBe(lease.repositoryPath)
			expect(lease.commit).toBe(commit2)
			expect(lease.info).toEqual({ commit: commit2, ref: undefined, url })
			expect(await exists(lockPathFor(cacheDirectory, remote))).toBe(true)
		} finally {
			await lease.release()
		}

		expect(await exists(lockPathFor(cacheDirectory, remote))).toBe(false)
	})

	it('should fetch updates into the cached clone', async () => {
		commit3 = await commitFile('changelog.md', '# Changes\n', 'Add changelog')

		const markerPath = join(
			cacheDirectory,
			'repos',
			...remote.cacheKey,
			'.git',
			'metascope-test-marker',
		)
		await writeFile(markerPath, 'marker')

		const lease = await checkoutRemoteRepository(remote, { cacheDirectory })
		try {
			expect(lease.commit).toBe(commit3)
			expect(await exists(markerPath)).toBe(true)
		} finally {
			await lease.release()
		}
	})

	it('should use the cached clone without fetching in offline mode', async () => {
		const commit4 = await commitFile('notes.md', '# Notes\n', 'Add notes')

		const offlineLease = await checkoutRemoteRepository(remote, { cacheDirectory, offline: true })
		try {
			expect(offlineLease.commit).toBe(commit3)
		} finally {
			await offlineLease.release()
		}

		const onlineLease = await checkoutRemoteRepository(remote, { cacheDirectory })
		try {
			expect(onlineLease.commit).toBe(commit4)
		} finally {
			await onlineLease.release()
		}
	})

	it('should throw in offline mode when the repository is not cached', async () => {
		const emptyCacheDirectory = await makeTemporaryDirectory('metascope-remote-empty-cache-')
		await expect(
			checkoutRemoteRepository(remote, { cacheDirectory: emptyCacheDirectory, offline: true }),
		).rejects.toThrow(NOT_CACHED_REGEX)
	})

	it('should check out a tag', async () => {
		const lease = await checkoutRemoteRepository(parse(`${url}#v1.0.0`), { cacheDirectory })
		try {
			expect(lease.commit).toBe(commit1)
			expect(lease.info.ref).toBe('v1.0.0')
		} finally {
			await lease.release()
		}
	})

	it('should check out a branch', async () => {
		const lease = await checkoutRemoteRepository(parse(`${url}#feature`), { cacheDirectory })
		try {
			expect(lease.commit).toBe(featureCommit)
			expect(await git(lease.repositoryPath, 'branch', '--show-current')).toBe('feature')
		} finally {
			await lease.release()
		}
	})

	it('should check out an abbreviated commit', async () => {
		const lease = await checkoutRemoteRepository(parse(`${url}#${commit2.slice(0, 7)}`), {
			cacheDirectory,
		})
		try {
			expect(lease.commit).toBe(commit2)
		} finally {
			await lease.release()
		}
	})

	it('should reject an unknown ref', async () => {
		await expect(
			checkoutRemoteRepository(parse(`${url}#does-not-exist`), { cacheDirectory }),
		).rejects.toThrow(UNKNOWN_REF_REGEX)
		expect(await exists(lockPathFor(cacheDirectory, remote))).toBe(false)
	})

	it('should resolve a subdirectory within the clone', async () => {
		const lease = await checkoutRemoteRepository(
			{ ...remote, subdirectory: 'packages/sub' },
			{ cacheDirectory },
		)
		try {
			expect(lease.path).toBe(join(lease.repositoryPath, 'packages/sub'))
			expect(await exists(join(lease.path, 'package.json'))).toBe(true)
		} finally {
			await lease.release()
		}
	})

	it('should remove a stale lock left by a dead process', async () => {
		const deadProcess = exec('node', ['-e', ''], { throwOnError: true })
		await deadProcess
		const deadProcessId = deadProcess.pid
		expect(deadProcessId).toBeDefined()

		const lockPath = lockPathFor(cacheDirectory, remote)
		await mkdir(dirname(lockPath), { recursive: true })
		await writeFile(lockPath, String(deadProcessId))

		const lease = await checkoutRemoteRepository(remote, { cacheDirectory })
		try {
			expect(lease.commit).toBeDefined()
		} finally {
			await lease.release()
		}

		expect(await exists(lockPath)).toBe(false)
	})

	it(
		'should serialize concurrent checkouts of the same repository',
		{ timeout: 15_000 },
		async () => {
			const first = await checkoutRemoteRepository(remote, { cacheDirectory })
			const secondPromise = checkoutRemoteRepository(parse(`${url}#v1.0.0`), {
				cacheDirectory,
			})

			await sleep(500)
			const status = await Promise.race([
				(async () => {
					await secondPromise
					return 'done'
				})(),
				(async () => {
					await sleep(0)
					return 'pending'
				})(),
			])
			expect(status).toBe('pending')

			await first.release()
			const second = await secondPromise
			try {
				expect(second.commit).toBe(commit1)
			} finally {
				await second.release()
			}
		},
	)

	it('should clone into a temporary directory when caching is disabled', async () => {
		const emptyCacheDirectory = await makeTemporaryDirectory('metascope-remote-no-cache-')
		const lease = await checkoutRemoteRepository(remote, {
			cache: false,
			cacheDirectory: emptyCacheDirectory,
		})

		try {
			expect(lease.commit).toBe(await git(sourceDirectory, 'rev-parse', 'main'))
			expect(await exists(join(lease.repositoryPath, '.git'))).toBe(true)
			expect(lease.repositoryPath.startsWith(tmpdir())).toBe(true)
			expect(await exists(join(emptyCacheDirectory, 'repos'))).toBe(false)
			expect(await exists(join(emptyCacheDirectory, 'locks'))).toBe(false)
		} finally {
			await lease.release()
		}

		expect(await exists(lease.repositoryPath)).toBe(false)
	})

	it('should reject offline mode when caching is disabled', async () => {
		await expect(checkoutRemoteRepository(remote, { cache: false, offline: true })).rejects.toThrow(
			NO_CACHE_OFFLINE_REGEX,
		)
	})

	it('should extract metadata from a remote URL via getMetadata', async () => {
		const result = await getMetadata({
			absolute: false,
			cache: false,
			path: url,
			sources: ['gitStats', 'metascope', 'nodePackageJson'],
		})

		const headCommit = await git(sourceDirectory, 'rev-parse', 'main')
		expect(firstOf(result.nodePackageJson)?.data.name).toBe('remote-fixture')
		expect(firstOf(result.nodePackageJson)?.source).toBe('package.json')
		expect(firstOf(result.gitStats)?.data.branchCurrent).toBe('main')
		expect(result.metascope?.data.remote).toEqual({ commit: headCommit, url })
	})

	it('should delete the temporary clone when getMetadata returns', async () => {
		const result = await getMetadata({ cache: false, path: url, sources: ['metascope'] })

		// Reported paths always use forward slashes, even on Windows
		const scannedPath = result.metascope?.data.options.path
		const realTemporaryDirectory = await realpath(tmpdir())
		const temporaryDirectory = realTemporaryDirectory.replaceAll('\\', '/')
		expect(scannedPath).toBeDefined()
		expect(scannedPath!.startsWith(temporaryDirectory)).toBe(true)
		expect(await exists(scannedPath!)).toBe(false)
	})

	it('should delete the temporary clone when getMetadata throws', async () => {
		const before = await temporaryCloneDirectories()
		await expect(
			getMetadata({ cache: false, path: `${url}#does-not-exist`, sources: ['metascope'] }),
		).rejects.toThrow(UNKNOWN_REF_REGEX)
		expect(await temporaryCloneDirectories()).toEqual(before)
	})

	it('should record the requested ref in the metascope source', async () => {
		const result = await getMetadata({
			absolute: false,
			cache: false,
			path: `${url}#v1.0.0`,
			sources: ['metascope'],
		})

		expect(result.metascope?.data.remote).toEqual({ commit: commit1, ref: 'v1.0.0', url })
	})

	it('should leave local path scans unchanged', async () => {
		const result = await getMetadata({ path: '.', sources: ['metascope'] })
		expect(result.metascope?.data).not.toHaveProperty('remote')
	})
})

// ─── Live ───────────────────────────────────────────────────────────

describe.skipIf(process.env.METASCOPE_TEST_MOCK !== 'false')('live remote repository', () => {
	it('should clone a GitHub repository', { timeout: 120_000 }, async () => {
		const result = await getMetadata({
			cache: false,
			path: 'https://github.com/kitschpatrol/metascope',
			sources: ['gitStats', 'nodePackageJson'],
		})
		expect(firstOf(result.nodePackageJson)?.data.name).toBe('metascope')
		expect(firstOf(result.gitStats)?.data.commitCount).toBeGreaterThan(0)
	})
})
