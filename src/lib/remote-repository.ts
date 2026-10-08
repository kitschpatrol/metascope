import gitUrlParse from 'git-url-parse'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, open, readFile, rm, stat } from 'node:fs/promises'
import { homedir, platform, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { exec, NonZeroExitError } from 'tinyexec'
import { name as packageName } from '../../package.json' with { type: 'json' }
import { log } from './log'

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A remote git repository reference parsed from a URL.
 */
export type RemoteRepository = {
	/**
	 * Path segments identifying the repository within the cache directory: the
	 * host, followed by the repository path.
	 */
	cacheKey: string[]
	/** The URL passed to `git clone` and `git fetch`. */
	cloneUrl: string
	/** The original input string. */
	href: string
	/**
	 * Branch, tag, or commit to check out. `undefined` means the remote's default
	 * branch.
	 */
	ref: string | undefined
	/**
	 * Subdirectory within the repository to scan, if the URL points inside the
	 * tree.
	 */
	subdirectory: string | undefined
}

/**
 * Summary of the remote repository checkout that a scan was performed against.
 * Recorded in the `metascope` source output.
 */
export type RemoteRepositoryInfo = {
	/** Full SHA of the scanned commit. */
	commit: string
	/** The branch, tag, or commit that was requested, if any. */
	ref?: string
	/** The URL the repository was cloned from. */
	url: string
}

/**
 * A checked-out remote repository in the local cache. Hold the lease for the
 * duration of extraction, then call `release` to let other processes use the
 * cache entry.
 */
export type RemoteRepositoryLease = {
	/** Full SHA of the checked-out commit. */
	commit: string
	/** Summary of the checkout, for recording in scan output. */
	info: RemoteRepositoryInfo
	/**
	 * Absolute path to scan: the clone root, or the requested subdirectory within
	 * it.
	 */
	path: string
	/** Release the cache lock. Must be called when extraction is complete. */
	release: () => Promise<void>
	/** Absolute path to the clone root in the cache. */
	repositoryPath: string
}

export type CheckoutRemoteRepositoryOptions = {
	/**
	 * Keep the clone in the cache directory for reuse across runs. When false,
	 * clone into a temporary directory that is deleted on `release`. Defaults to
	 * true.
	 */
	cache?: boolean
	/**
	 * Directory where clones are cached when `cache` is enabled. Defaults to
	 * `getDefaultCacheDirectory()`. Not exposed through `getMetadata`; exists so
	 * tests can isolate themselves from the real cache.
	 */
	cacheDirectory?: string
	/**
	 * Use the cached clone as-is without fetching updates. Fails if not cached,
	 * and cannot be combined with `cache: false`.
	 */
	offline?: boolean
}

// ─── URL Parsing ────────────────────────────────────────────────────

const SCHEME_REGEX = /^(?:git\+)?(?:https?|ssh|git|file):\/\//iv
const SCP_LIKE_REGEX = /^[\w.\-]+@[\w.\-]+:(?!\/\/)\S+$/v
const GIT_PLUS_PREFIX_REGEX = /^git\+/iv
const LEADING_DOTS_REGEX = /^\.+/v
const UNSAFE_SEGMENT_CHARACTERS_REGEX = /[^a-z0-9._\-]/gv

/**
 * Whether a `path` option should be treated as a remote git repository URL
 * rather than a local directory. Recognizes `https://`, `http://`, `ssh://`,
 * `git://`, and `file://` URLs (optionally prefixed with `git+`), and scp-style
 * `user@host:path` addresses. Bare `owner/repo` shorthand is never treated as
 * remote, since it is a valid relative path.
 */
export function isRemoteRepositoryUrl(input: string): boolean {
	const trimmed = input.trim()
	return SCHEME_REGEX.test(trimmed) || SCP_LIKE_REGEX.test(trimmed)
}

/**
 * Make a string safe to use as a single cache directory segment. Appends a
 * short hash when characters had to be replaced, so distinct inputs that
 * sanitize to the same text still get distinct cache entries.
 */
function sanitizeSegment(segment: string): string {
	const lowered = segment.toLowerCase()
	const sanitized = lowered
		.replaceAll(UNSAFE_SEGMENT_CHARACTERS_REGEX, '-')
		.replace(LEADING_DOTS_REGEX, '')

	if (sanitized === lowered) {
		return sanitized
	}

	const hash = createHash('sha1').update(lowered).digest('hex').slice(0, 8)
	return sanitized === '' ? hash : `${sanitized}-${hash}`
}

type ParsedGitUrl = ReturnType<typeof gitUrlParse>

type RepositoryLocation = {
	cloneUrl: string
	reference: string
	repositoryPath: string
}

const GIT_SUFFIX_REGEX = /\.git$/v

/**
 * GitHub URLs with paths beyond `/tree/` and `/blob/` are not understood by
 * git-url-parse: `/commit/<sha>` is silently dropped and `/releases/tag/<tag>`
 * comes through as a deep repository path. Inspect the URL path directly, trim
 * it back to `owner/name`, and pull out the ref when the path names one.
 */
function resolveGitHubLocation(
	parsed: ParsedGitUrl,
	base: string,
	input: string,
	fallback: RepositoryLocation,
): RepositoryLocation {
	let segments: string[]
	try {
		segments = new URL(base).pathname.split('/').filter((segment) => segment !== '')
	} catch {
		// Scp-style addresses are not URLs, and never carry browse paths
		return fallback
	}

	const [owner, repository, kind, ...rest] = segments
	if (owner === undefined || repository === undefined || kind === undefined) {
		return fallback
	}

	const repositoryPath = `${owner}/${repository.replace(GIT_SUFFIX_REGEX, '')}`
	const cloneUrl = `${parsed.protocol}://github.com/${repositoryPath}.git`

	if (kind === 'commit' && rest[0] !== undefined) {
		return { cloneUrl, reference: rest[0], repositoryPath }
	}

	if (kind === 'releases' && rest[0] === 'tag' && rest[1] !== undefined) {
		return { cloneUrl, reference: rest[1], repositoryPath }
	}

	log.warn(
		`Ignoring unrecognized GitHub URL path "/${[kind, ...rest].join('/')}" in "${input}", scanning the default branch`,
	)
	return { cloneUrl, reference: fallback.reference, repositoryPath }
}

/**
 * Parse a remote git repository URL into its clone URL, optional ref, optional
 * subdirectory, and cache key. Returns `undefined` when the input does not look
 * like a remote URL (see `isRemoteRepositoryUrl`), and throws when it does but
 * cannot be parsed.
 *
 * Supported forms, in addition to plain clone URLs:
 *
 * - `<url>#<ref>` checks out a branch, tag, or commit
 * - GitHub `/tree/<ref>/<path>` and `/blob/<ref>/<path>` URLs (and the equivalent
 *   GitLab and Bitbucket browse URLs) set the ref and the subdirectory to scan
 * - GitHub `/commit/<sha>` and `/releases/tag/<tag>` URLs set the ref
 *
 * Branch names containing slashes are ambiguous in `/tree/` URLs; use the
 * `#<ref>` form for those.
 */
export function parseRemoteRepository(input: string): RemoteRepository | undefined {
	const trimmed = input.trim()
	if (!isRemoteRepositoryUrl(trimmed)) {
		return undefined
	}

	// Split the fragment off before parsing, since git-url-parse rejects
	// fragments on scp-style addresses. Git itself never sees the fragment.
	const hashIndex = trimmed.indexOf('#')
	const base = (hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex)).replace(
		GIT_PLUS_PREFIX_REGEX,
		'',
	)
	const fragment = hashIndex === -1 ? '' : trimmed.slice(hashIndex + 1)

	let parsed: ParsedGitUrl
	try {
		parsed = gitUrlParse(base)
	} catch (error) {
		throw new Error(
			`Invalid remote repository URL "${input}": ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		)
	}

	if (parsed.full_name === '' || parsed.name === '') {
		throw new Error(`Remote repository URL "${input}" does not include a repository path`)
	}

	// Browse URLs (e.g. GitHub /tree/<ref>/<path>) are not cloneable as-is, so
	// rebuild the base URL. Plain clone URLs pass through untouched to preserve
	// credentials, ports, and anything else git-url-parse might drop when it
	// reassembles the URL.
	const isBrowseUrl = parsed.filepathtype !== ''
	let location: RepositoryLocation = {
		cloneUrl: isBrowseUrl ? parsed.toString() : base,
		reference: parsed.ref === '' ? fragment : parsed.ref,
		repositoryPath: parsed.full_name,
	}

	if (!isBrowseUrl && parsed.resource === 'github.com') {
		location = resolveGitHubLocation(parsed, base, input, location)
	}

	const host =
		(parsed.resource === '' ? 'local' : parsed.resource) +
		(parsed.port === '' ? '' : `_${parsed.port}`)

	return {
		cacheKey: [host, ...location.repositoryPath.split('/')].map((segment) =>
			sanitizeSegment(segment),
		),
		cloneUrl: location.cloneUrl,
		href: input,
		ref: location.reference === '' ? undefined : location.reference,
		subdirectory: parsed.filepath === '' ? undefined : parsed.filepath,
	}
}

// ─── Cache Directory ────────────────────────────────────────────────

function environmentPath(key: string): string | undefined {
	const value = process.env[key]
	return value === undefined || value === '' ? undefined : value
}

/**
 * The platform-specific directory where remote repositories are cached when no
 * `cacheDirectory` option is provided: `~/Library/Caches/metascope` on macOS,
 * `%LOCALAPPDATA%\metascope\Cache` on Windows, and `$XDG_CACHE_HOME/metascope`
 * (or `~/.cache/metascope`) elsewhere.
 */
export function getDefaultCacheDirectory(): string {
	const home = homedir()
	const currentPlatform = platform()

	if (currentPlatform === 'darwin') {
		return join(home, 'Library', 'Caches', packageName)
	}

	return currentPlatform === 'win32'
		? join(environmentPath('LOCALAPPDATA') ?? join(home, 'AppData', 'Local'), packageName, 'Cache')
		: join(environmentPath('XDG_CACHE_HOME') ?? join(home, '.cache'), packageName)
}

// ─── Locking ────────────────────────────────────────────────────────

const LOCK_POLL_MS = 250
const LOCK_TIMEOUT_MS = 10 * 60 * 1000
const LOCK_STALE_MS = 60 * 60 * 1000

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error
}

function isProcessAlive(processId: number): boolean {
	try {
		process.kill(processId, 0)
		return true
	} catch (error) {
		// EPERM means the process exists but belongs to another user
		return isErrnoException(error) && error.code !== 'ESRCH'
	}
}

/**
 * A lock is stale when the process that created it is gone, or when it has no
 * readable owner and is older than the stale threshold.
 */
async function isLockStale(lockPath: string): Promise<boolean> {
	let content: string
	let lockStat: Awaited<ReturnType<typeof stat>>
	try {
		;[content, lockStat] = await Promise.all([readFile(lockPath, 'utf8'), stat(lockPath)])
	} catch {
		// Released by its holder between our checks; the next attempt will retry
		return false
	}

	const processId = Number(content.trim())
	return Number.isInteger(processId) && processId > 0
		? !isProcessAlive(processId)
		: Date.now() - lockStat.mtimeMs > LOCK_STALE_MS
}

type ReleaseLock = () => Promise<void>

/**
 * Atomically create the lock file with this process's ID as its owner. Returns
 * `undefined` if another process holds the lock.
 */
async function tryAcquireLock(lockPath: string): Promise<ReleaseLock | undefined> {
	try {
		const handle = await open(lockPath, 'wx')
		try {
			await handle.writeFile(String(process.pid))
		} finally {
			await handle.close()
		}
	} catch (error) {
		if (isErrnoException(error) && error.code === 'EEXIST') {
			return undefined
		}

		throw error
	}

	return async () => {
		await rm(lockPath, { force: true })
	}
}

/**
 * Acquire an exclusive lock on a cache entry. Waits for a live holder to
 * finish, removes stale locks from dead processes, and gives up after
 * `timeoutMs`.
 */
async function acquireLock(lockPath: string, timeoutMs: number): Promise<ReleaseLock> {
	await mkdir(dirname(lockPath), { recursive: true })
	const deadline = Date.now() + timeoutMs

	let release = await tryAcquireLock(lockPath)
	while (release === undefined) {
		if (await isLockStale(lockPath)) {
			log.debug(`Removing stale lock file ${lockPath}`)
			await rm(lockPath, { force: true })
		} else if (Date.now() >= deadline) {
			throw new Error(
				`Timed out waiting for another metascope process to finish with this repository. If no other process is running, delete the lock file: ${lockPath}`,
			)
		} else {
			await sleep(LOCK_POLL_MS)
		}

		release = await tryAcquireLock(lockPath)
	}

	return release
}

// ─── Git ────────────────────────────────────────────────────────────

/**
 * Run git non-interactively and return stdout. Throws with git's stderr on
 * failure.
 */
async function git(gitArguments: string[], cwd?: string): Promise<string> {
	try {
		const { stdout } = await exec('git', gitArguments, {
			nodeOptions: {
				// Fail fast instead of hanging on a credential prompt
				// eslint-disable-next-line ts/naming-convention -- Environment variable
				env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
				stdio: ['ignore', 'pipe', 'pipe'],
				...(cwd !== undefined && { cwd }),
			},
			throwOnError: true,
		})
		return stdout
	} catch (error) {
		if (error instanceof NonZeroExitError) {
			const stderr = error.output?.stderr.trim() ?? ''
			throw new Error(
				`git ${gitArguments[0]} failed${stderr === '' ? ` with exit code ${error.exitCode}` : `: ${stderr}`}`,
				{ cause: error },
			)
		}

		throw error
	}
}

async function revParse(repositoryPath: string, revision: string): Promise<string | undefined> {
	try {
		const output = await git(
			['rev-parse', '--verify', '--quiet', '--end-of-options', revision],
			repositoryPath,
		)
		const commit = output.trim()
		return commit === '' ? undefined : commit
	} catch {
		return undefined
	}
}

async function isGitRepository(path: string): Promise<boolean> {
	try {
		const gitDirectoryStat = await stat(join(path, '.git'))
		return gitDirectoryStat.isDirectory()
	} catch {
		return false
	}
}

const REMOTE_HEAD_PREFIX = 'refs/remotes/origin/'
// Git's peel syntax, resolving a tag to the commit it points at
const COMMIT_PEEL_SUFFIX = '^{commit}'

/**
 * Name of the remote's default branch, from the `origin/HEAD` symbolic ref
 * recorded at clone time. Falls back to querying the remote when the recorded
 * branch no longer exists (e.g. after a `master` to `main` rename).
 */
async function getDefaultBranch(repositoryPath: string, remote: RemoteRepository): Promise<string> {
	const read = async (): Promise<string | undefined> => {
		try {
			const output = await git(
				['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'],
				repositoryPath,
			)
			const target = output.trim()
			if (!target.startsWith(REMOTE_HEAD_PREFIX)) {
				return undefined
			}

			const branch = target.slice(REMOTE_HEAD_PREFIX.length)
			return (await revParse(repositoryPath, target)) === undefined ? undefined : branch
		} catch {
			return undefined
		}
	}

	const recorded = await read()
	if (recorded !== undefined) {
		return recorded
	}

	log.debug('Default branch is missing or stale, querying the remote...')
	await git(['remote', 'set-head', 'origin', '--auto'], repositoryPath)
	const refreshed = await read()
	if (refreshed === undefined) {
		throw new Error(`Could not determine the default branch of ${remote.cloneUrl}`)
	}

	return refreshed
}

type CheckoutTarget = {
	/** Local branch to create or reset, when checking out a branch. */
	branch: string | undefined
	/** Revision to check out. */
	revision: string
}

async function resolveCheckoutTarget(
	repositoryPath: string,
	remote: RemoteRepository,
): Promise<CheckoutTarget> {
	if (remote.ref === undefined) {
		const branch = await getDefaultBranch(repositoryPath, remote)
		return { branch, revision: `${REMOTE_HEAD_PREFIX}${branch}` }
	}

	const remoteBranch = `${REMOTE_HEAD_PREFIX}${remote.ref}`
	if ((await revParse(repositoryPath, remoteBranch)) !== undefined) {
		return { branch: remote.ref, revision: remoteBranch }
	}

	const tag = `refs/tags/${remote.ref}${COMMIT_PEEL_SUFFIX}`
	if ((await revParse(repositoryPath, tag)) !== undefined) {
		return { branch: undefined, revision: tag }
	}

	const commit = await revParse(repositoryPath, `${remote.ref}${COMMIT_PEEL_SUFFIX}`)
	if (commit !== undefined) {
		return { branch: undefined, revision: commit }
	}

	throw new Error(
		`Could not find a branch, tag, or commit named "${remote.ref}" in ${remote.cloneUrl}`,
	)
}

async function checkout(repositoryPath: string, target: CheckoutTarget): Promise<void> {
	const checkoutArguments = ['-c', 'advice.detachedHead=false', 'checkout', '--force']
	if (target.branch === undefined) {
		checkoutArguments.push('--detach', target.revision)
	} else {
		checkoutArguments.push('-B', target.branch, target.revision)
	}

	await git(checkoutArguments, repositoryPath)
}

async function fetchUpdates(repositoryPath: string, remote: RemoteRepository): Promise<void> {
	try {
		// `followRemoteHEAD` (git 2.48+) keeps origin/HEAD in sync with the
		// remote's default branch; older versions ignore the setting
		await git(
			[
				'-c',
				'remote.origin.followRemoteHEAD=always',
				'fetch',
				'--prune',
				'--prune-tags',
				'--force',
				'--tags',
				'origin',
			],
			repositoryPath,
		)
	} catch (error) {
		log.warn(
			`Could not update cached clone of ${remote.cloneUrl}, using cached state: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

async function clone(repositoryPath: string, remote: RemoteRepository): Promise<void> {
	// Clear any leftovers from an interrupted clone
	await rm(repositoryPath, { force: true, recursive: true })
	await mkdir(dirname(repositoryPath), { recursive: true })
	log.debug(`Cloning ${remote.cloneUrl} into ${repositoryPath}...`)
	const startTime = performance.now()
	await git(['clone', '--filter=blob:none', '--no-checkout', '--', remote.cloneUrl, repositoryPath])
	log.debug(`Cloned in ${Math.round(performance.now() - startTime)}ms`)
}

// ─── Checkout ───────────────────────────────────────────────────────

/**
 * Make sure `repositoryPath` holds an up-to-date clone: fetch into an existing
 * clone, or clone fresh.
 */
async function ensureClone(
	repositoryPath: string,
	remote: RemoteRepository,
	offline: boolean,
): Promise<void> {
	if (await isGitRepository(repositoryPath)) {
		log.debug(`Using cached clone of ${remote.cloneUrl} at ${repositoryPath}`)
		await git(['remote', 'set-url', 'origin', remote.cloneUrl], repositoryPath)
		if (offline) {
			log.debug('Skipping fetch in offline mode')
		} else {
			await fetchUpdates(repositoryPath, remote)
		}
	} else if (offline) {
		throw new Error(
			`Remote repository ${remote.cloneUrl} is not cached and offline mode is enabled`,
		)
	} else {
		await clone(repositoryPath, remote)
	}
}

async function createLease(
	repositoryPath: string,
	remote: RemoteRepository,
	release: ReleaseLock,
): Promise<RemoteRepositoryLease> {
	const target = await resolveCheckoutTarget(repositoryPath, remote)
	await checkout(repositoryPath, target)
	const head = await git(['rev-parse', 'HEAD'], repositoryPath)
	const commit = head.trim()
	log.debug(`Checked out ${target.revision} (${commit})`)

	return {
		commit,
		info: { commit, ref: remote.ref, url: remote.cloneUrl },
		path:
			remote.subdirectory === undefined
				? repositoryPath
				: join(repositoryPath, remote.subdirectory),
		release,
		repositoryPath,
	}
}

/**
 * Clone a remote repository into the cache (or update the cached clone), check
 * out the requested ref, and return the local path to scan. Clones are partial
 * clones without file contents: the full commit history is available for git
 * statistics, but file contents are only downloaded for the checked-out tree.
 *
 * The returned lease holds a lock on the cache entry so concurrent runs against
 * the same repository do not interfere with each other. With `cache: false` the
 * clone lives in a temporary directory instead, and the lease owns that
 * directory. Either way, call `release` when extraction is complete.
 */
export async function checkoutRemoteRepository(
	remote: RemoteRepository,
	options: CheckoutRemoteRepositoryOptions = {},
): Promise<RemoteRepositoryLease> {
	const offline = options.offline ?? false
	let repositoryPath: string
	let release: ReleaseLock

	if (options.cache === false) {
		if (offline) {
			throw new Error(
				`Cannot scan ${remote.cloneUrl} in offline mode with caching disabled, since there is no cached clone to use`,
			)
		}

		const temporaryDirectory = await mkdtemp(join(tmpdir(), `${packageName}-clone-`))
		log.debug(`Caching disabled, cloning into temporary directory ${temporaryDirectory}`)
		repositoryPath = join(temporaryDirectory, 'repo')
		release = async () => {
			await rm(temporaryDirectory, { force: true, recursive: true })
		}
	} else {
		const cacheDirectory = resolve(options.cacheDirectory ?? getDefaultCacheDirectory())
		repositoryPath = join(cacheDirectory, 'repos', ...remote.cacheKey)
		const lockPath = `${join(cacheDirectory, 'locks', ...remote.cacheKey)}.lock`
		release = await acquireLock(lockPath, LOCK_TIMEOUT_MS)
	}

	try {
		await ensureClone(repositoryPath, remote, offline)
		return await createLease(repositoryPath, remote, release)
	} catch (error) {
		await release()
		throw error
	}
}
