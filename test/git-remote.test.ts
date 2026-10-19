import { describe, expect, it } from 'vitest'
import { getRepositoryUrlFromConfig } from '../src/lib/utilities/git-remote'

function repositoryUrlFrom(url: string) {
	return getRepositoryUrlFromConfig({ origin: { url } })
}

describe('getRepositoryUrlFromConfig', () => {
	it('should convert an scp-style SSH remote to an https URL', () => {
		expect(repositoryUrlFrom('git@github.com:kitschpatrol/metascope.git')).toBe(
			'https://github.com/kitschpatrol/metascope',
		)
	})

	it('should strip the .git suffix and trailing slash from an https remote', () => {
		expect(repositoryUrlFrom('https://codeberg.org/owner/repo.git/')).toBe(
			'https://codeberg.org/owner/repo',
		)
	})

	it('should drop a token embedded in an https remote', () => {
		expect(repositoryUrlFrom('https://ghp_secret@github.com/owner/repo.git')).toBe(
			'https://github.com/owner/repo',
		)
	})

	it('should drop a username and password embedded in an https remote', () => {
		expect(repositoryUrlFrom('https://user:pass@gitlab.com/group/sub/repo.git')).toBe(
			'https://gitlab.com/group/sub/repo',
		)
	})

	it('should drop the port of an SSH remote', () => {
		expect(repositoryUrlFrom('ssh://git@gitlab.example.org:2222/group/repo.git')).toBe(
			'https://gitlab.example.org/group/repo',
		)
	})

	it('should keep the scheme and port of a web remote', () => {
		/* eslint-disable unicorn/prefer-https -- an http remote is the case under test */
		expect(repositoryUrlFrom('http://git.example.org:8080/owner/repo.git')).toBe(
			'http://git.example.org:8080/owner/repo',
		)
		/* eslint-enable unicorn/prefer-https */
	})

	it('should skip an SSH config host alias', () => {
		expect(repositoryUrlFrom('git@github-work:owner/repo.git')).toBeUndefined()
	})

	it('should skip local remotes', () => {
		expect(repositoryUrlFrom('file:///Users/someone/Code/repo')).toBeUndefined()
		expect(repositoryUrlFrom('/Users/someone/Code/repo')).toBeUndefined()
		expect(repositoryUrlFrom('../repo')).toBeUndefined()
	})

	it('should prefer the origin remote', () => {
		expect(
			getRepositoryUrlFromConfig({
				upstream: { url: 'git@github.com:upstream/repo.git' },
				// eslint-disable-next-line perfectionist/sort-objects -- origin listed second to check that it still wins
				origin: { url: 'git@github.com:fork/repo.git' },
			}),
		).toBe('https://github.com/fork/repo')
	})

	it('should fall back to the next remote with a usable URL', () => {
		expect(
			getRepositoryUrlFromConfig({
				origin: { url: '../local-mirror' },
				upstream: { url: 'git@github.com:upstream/repo.git' },
			}),
		).toBe('https://github.com/upstream/repo')
	})

	it('should return undefined without remotes', () => {
		expect(getRepositoryUrlFromConfig(undefined)).toBeUndefined()
		expect(getRepositoryUrlFromConfig({})).toBeUndefined()
		expect(getRepositoryUrlFromConfig({ origin: {} })).toBeUndefined()
	})
})
