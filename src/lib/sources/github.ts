import gitUrlParse from 'git-url-parse'
import { Octokit } from 'octokit'
import git from 'simple-git'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type GitHubData = {
	closedIssueCount?: number
	closedPullRequestCount?: number
	commitsBehindUpstream?: number
	contributorCount?: number
	createdAt?: string
	defaultBranch?: string
	description?: string
	diskUsageKb?: number
	forkCount?: number
	hasDiscussions?: boolean
	hasLfs?: boolean
	hasPages?: boolean
	hasWiki?: boolean
	homepage?: string
	isArchived?: boolean
	isFork?: boolean
	isPrivate?: boolean
	isTemplate?: boolean
	languages?: Record<string, number>
	lastReleaseDate?: string
	lastReleaseVersion?: string
	license?: string
	openIssueCount?: number
	mergedPullRequestCount?: number
	openPullRequestCount?: number
	ownerLogin?: string
	primaryLanguage?: string
	releaseCount?: number
	releaseDownloadCount?: number
	repoName?: string
	repoUrl?: string
	stargazerCount?: number
	submoduleCount?: number
	topics?: string[]
	updatedAt?: string
	vulnerabilityAlertCount?: number
	watcherCount?: number
}

const gitHubRepoSchema = z.object({
	repository: z.object({
		closedIssues: z.object({ totalCount: z.number() }),
		contributorCount: z.number().optional(),
		createdAt: z.string(),
		defaultBranchRef: z
			.object({
				name: z.string(),
			})
			.nullable(),
		description: z.string().nullable(),
		diskUsage: z.number().nullable(),
		forkCount: z.number(),
		gitattributes: z
			.object({
				text: z.string().nullable(),
			})
			.nullable(),
		gitmodules: z
			.object({
				text: z.string().nullable(),
			})
			.nullable(),
		hasDiscussionsEnabled: z.boolean(),
		hasWikiEnabled: z.boolean(),
		homepageUrl: z.string().nullable(),
		isArchived: z.boolean(),
		isFork: z.boolean(),
		isPrivate: z.boolean(),
		isTemplate: z.boolean(),
		languages: z
			.object({
				edges: z.array(
					z.object({
						node: z.object({ name: z.string() }),
						size: z.number(),
					}),
				),
			})
			.nullable(),
		latestRelease: z
			.object({
				createdAt: z.string(),
				releaseAssets: z.object({
					nodes: z.array(z.object({ downloadCount: z.number() })),
				}),
				tagName: z.string(),
			})
			.nullable(),
		name: z.string(),
		openIssues: z.object({ totalCount: z.number() }),
		owner: z.object({ login: z.string() }),
		parent: z
			.object({
				defaultBranchRef: z.object({ name: z.string() }).nullable(),
				name: z.string(),
				owner: z.object({ login: z.string() }),
			})
			.nullable(),
		primaryLanguage: z
			.object({
				name: z.string(),
			})
			.nullable(),
		closedPullRequests: z.object({ totalCount: z.number() }),
		mergedPullRequests: z.object({ totalCount: z.number() }),
		openPullRequests: z.object({ totalCount: z.number() }),
		releases: z.object({ totalCount: z.number() }),
		repositoryTopics: z.object({
			nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })),
		}),
		stargazerCount: z.number(),
		updatedAt: z.string(),
		url: z.string(),
		vulnerabilityAlerts: z.object({ totalCount: z.number() }).nullable(),
		watchers: z.object({ totalCount: z.number() }),
	}),
})

type ParsedRemote = {
	owner: string
	repo: string
}

async function getGitHubRemote(path: string): Promise<ParsedRemote | undefined> {
	try {
		const repo = git(path)
		const remotes = await repo.getRemotes(true)
		for (const remote of remotes) {
			const url = remote.refs.fetch || remote.refs.push
			if (!url) continue
			try {
				const parsed = gitUrlParse(url)
				if (parsed.source === 'github.com' && parsed.owner && parsed.name) {
					return { owner: parsed.owner, repo: parsed.name }
				}
			} catch {
				// Skip unparsable URLs
			}
		}
	} catch {
		// Not a git repo or no remotes
	}

	return undefined
}

const graphqlQuery = `
	query($owner: String!, $repo: String!) {
		repository(owner: $owner, name: $repo) {
			name
			owner { login }
			url
			description
			homepageUrl
			createdAt
			updatedAt
			isArchived
			isFork
			isPrivate
			isTemplate
			diskUsage
			stargazerCount
			forkCount
			hasWikiEnabled
			hasDiscussionsEnabled
			defaultBranchRef { name }
			primaryLanguage { name }
			parent {
				owner { login }
				name
				defaultBranchRef { name }
			}
			gitattributes: object(expression: "HEAD:.gitattributes") {
				... on Blob { text }
			}
			gitmodules: object(expression: "HEAD:.gitmodules") {
				... on Blob { text }
			}
			openIssues: issues(states: OPEN) { totalCount }
			closedIssues: issues(states: CLOSED) { totalCount }
			openPullRequests: pullRequests(states: OPEN) { totalCount }
			closedPullRequests: pullRequests(states: CLOSED) { totalCount }
			mergedPullRequests: pullRequests(states: MERGED) { totalCount }
			vulnerabilityAlerts(states: OPEN) { totalCount }
			watchers { totalCount }
			releases { totalCount }
			latestRelease {
				tagName
				createdAt
				releaseAssets(first: 100) {
					nodes { downloadCount }
				}
			}
			repositoryTopics(first: 50) {
				nodes { topic { name } }
			}
			languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
				edges {
					node { name }
					size
				}
			}
		}
	}
`

// GitHub Pages detection requires REST API
async function checkHasPages(octokit: Octokit, owner: string, repo: string): Promise<boolean> {
	try {
		const response = await octokit.rest.repos.get({ owner, repo })
		return response.data.has_pages
	} catch {
		return false
	}
}

type GitHubRepoData = z.infer<typeof gitHubRepoSchema>['repository']

async function getCommitsBehindUpstream(
	octokit: Octokit,
	owner: string,
	repo: string,
	defaultBranch: string,
	parent: NonNullable<GitHubRepoData['parent']>,
): Promise<number | undefined> {
	const parentBranch = parent.defaultBranchRef?.name
	if (!parentBranch) return undefined

	try {
		const response = await octokit.rest.repos.compareCommitsWithBasehead({
			basehead: `${parent.owner.login}:${parentBranch}...${owner}:${defaultBranch}`,
			owner,
			repo,
		})
		return response.data.behind_by
	} catch {
		return undefined
	}
}

function countSubmodules(gitmodulesText: string | undefined): number {
	if (!gitmodulesText) return 0
	const matches = gitmodulesText.match(/\[submodule\s/g)
	return matches?.length ?? 0
}

function detectLfs(gitattributesText: string | undefined): boolean {
	if (!gitattributesText) return false
	return gitattributesText.includes('filter=lfs')
}

function extractLanguages(data: GitHubRepoData): Record<string, number> {
	const languages: Record<string, number> = {}
	if (data.languages?.edges) {
		for (const edge of data.languages.edges) {
			languages[edge.node.name] = edge.size
		}
	}

	return languages
}

function mapRepoData(
	data: GitHubRepoData,
	extras: { commitsBehindUpstream?: number; hasPages: boolean },
): GitHubData {
	const releaseDownloadCount =
		data.latestRelease?.releaseAssets.nodes.reduce((sum, asset) => sum + asset.downloadCount, 0) ??
		0

	return {
		closedIssueCount: data.closedIssues.totalCount,
		closedPullRequestCount: data.closedPullRequests.totalCount,
		commitsBehindUpstream: extras.commitsBehindUpstream,
		contributorCount: data.contributorCount,
		createdAt: data.createdAt,
		defaultBranch: data.defaultBranchRef?.name ?? undefined,
		description: data.description ?? undefined,
		diskUsageKb: data.diskUsage ?? undefined,
		forkCount: data.forkCount,
		hasDiscussions: data.hasDiscussionsEnabled,
		hasLfs: detectLfs(data.gitattributes?.text ?? undefined),
		hasPages: extras.hasPages,
		hasWiki: data.hasWikiEnabled,
		homepage: data.homepageUrl ?? undefined,
		isArchived: data.isArchived,
		isFork: data.isFork,
		isPrivate: data.isPrivate,
		isTemplate: data.isTemplate,
		languages: extractLanguages(data),
		lastReleaseDate: data.latestRelease?.createdAt ?? undefined,
		lastReleaseVersion: data.latestRelease?.tagName ?? undefined,
		license: undefined, // License from GitHub requires REST; codemeta already provides this
		mergedPullRequestCount: data.mergedPullRequests.totalCount,
		openIssueCount: data.openIssues.totalCount,
		openPullRequestCount: data.openPullRequests.totalCount,
		ownerLogin: data.owner.login,
		primaryLanguage: data.primaryLanguage?.name ?? undefined,
		releaseCount: data.releases.totalCount,
		releaseDownloadCount,
		repoName: data.name,
		repoUrl: data.url,
		stargazerCount: data.stargazerCount,
		submoduleCount: countSubmodules(data.gitmodules?.text ?? undefined),
		topics: data.repositoryTopics.nodes.map((n) => n.topic.name),
		updatedAt: data.updatedAt,
		vulnerabilityAlertCount: data.vulnerabilityAlerts?.totalCount ?? undefined,
		watcherCount: data.watchers.totalCount,
	}
}

export const githubSource: MetadataSource<'github'> = {
	async fetch(context: SourceContext): Promise<GitHubData> {
		log.debug('Fetching GitHub metadata...')
		const remote = await getGitHubRemote(context.path)
		if (!remote) return {}

		const { owner, repo } = remote

		const octokit = new Octokit(
			context.credentials.githubToken ? { auth: context.credentials.githubToken } : undefined,
		)

		const [graphqlResult, hasPages] = await Promise.all([
			octokit.graphql(graphqlQuery, { owner, repo }),
			checkHasPages(octokit, owner, repo),
		])

		const parsed = gitHubRepoSchema.parse(graphqlResult)
		const data = parsed.repository

		// If the repo is a fork, check how many commits behind upstream
		let commitsBehindUpstream: number | undefined
		if (data.isFork && data.parent && data.defaultBranchRef) {
			commitsBehindUpstream = await getCommitsBehindUpstream(
				octokit,
				owner,
				repo,
				data.defaultBranchRef.name,
				data.parent,
			)
		}

		return mapRepoData(data, { commitsBehindUpstream, hasPages })
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const remote = await getGitHubRemote(context.path)
		return remote !== undefined
	},
	key: 'github',
}
