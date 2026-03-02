import gitUrlParse from 'git-url-parse'
import { Octokit } from 'octokit'
import git from 'simple-git'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type GitHubData = {
	archivedAt?: string
	branchDefault?: string
	codeOfConduct?: string
	commitsBehindUpstream?: number
	contributorCount?: number
	createdAt?: string
	description?: string
	discussionCount?: number
	diskUsageKb?: number
	forkCount?: number
	fundingLinks?: { platform: string; url: string }[]
	hasContributing?: boolean
	hasDiscussions?: boolean
	hasIssues?: boolean
	hasLfs?: boolean
	hasPages?: boolean
	hasSecurityPolicy?: boolean
	hasSponsorships?: boolean
	hasWiki?: boolean
	homepage?: string
	isArchived?: boolean
	isFork?: boolean
	isInOrganization?: boolean
	isMirror?: boolean
	isPrivate?: boolean
	issueCountClosed?: number
	issueCountOpen?: number
	isTemplate?: boolean
	languagePrimary?: string
	languages?: Record<string, number>
	license?: string
	licenseSpdxId?: string
	ownerLogin?: string
	pullRequestCountClosed?: number
	pullRequestCountMerged?: number
	pullRequestCountOpen?: number
	pushedAt?: string
	releaseCount?: number
	releaseDateLatest?: string
	releaseDownloadCount?: number
	releaseVersionLatest?: string
	repoName?: string
	repoUrl?: string
	settings?: {
		allowAutoMerge?: boolean
		allowForking?: boolean
		allowUpdateBranch?: boolean
		deleteBranchOnMerge?: boolean
		mergeCommitAllowed?: boolean
		rebaseMergeAllowed?: boolean
		squashMergeAllowed?: boolean
		webCommitSignoffRequired?: boolean
	}
	stargazerCount?: number
	submoduleCount?: number
	topics?: string[]
	updatedAt?: string
	vulnerabilityAlertCount?: number
	watcherCount?: number
}

const gitHubRepoSchema = z.object({
	repository: z.object({
		archivedAt: z.string().nullable(),
		autoMergeAllowed: z.boolean(),
		allowUpdateBranch: z.boolean(),
		closedIssues: z.object({ totalCount: z.number() }),
		closedPullRequests: z.object({ totalCount: z.number() }),
		codeOfConduct: z.object({ name: z.string() }).nullable(),
		contributingGuidelines: z.object({ body: z.string() }).nullable(),
		contributorCount: z.number().optional(),
		createdAt: z.string(),
		defaultBranchRef: z
			.object({
				name: z.string(),
			})
			.nullable(),
		deleteBranchOnMerge: z.boolean(),
		description: z.string().nullable(),
		discussions: z.object({ totalCount: z.number() }),
		diskUsage: z.number().nullable(),
		forkCount: z.number(),
		forkingAllowed: z.boolean(),
		fundingLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
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
		hasIssuesEnabled: z.boolean(),
		hasSponsorshipsEnabled: z.boolean(),
		hasWikiEnabled: z.boolean(),
		homepageUrl: z.string().nullable(),
		isArchived: z.boolean(),
		isFork: z.boolean(),
		isInOrganization: z.boolean(),
		isMirror: z.boolean(),
		isPrivate: z.boolean(),
		isSecurityPolicyEnabled: z.boolean(),
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
		licenseInfo: z.object({ spdxId: z.string().nullable() }).nullable(),
		mergeCommitAllowed: z.boolean(),
		mergedPullRequests: z.object({ totalCount: z.number() }),
		name: z.string(),
		openIssues: z.object({ totalCount: z.number() }),
		openPullRequests: z.object({ totalCount: z.number() }),
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
		pushedAt: z.string().nullable(),
		rebaseMergeAllowed: z.boolean(),
		releases: z.object({ totalCount: z.number() }),
		repositoryTopics: z.object({
			nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })),
		}),
		squashMergeAllowed: z.boolean(),
		stargazerCount: z.number(),
		updatedAt: z.string(),
		url: z.string(),
		vulnerabilityAlerts: z.object({ totalCount: z.number() }).nullable(),
		watchers: z.object({ totalCount: z.number() }),
		webCommitSignoffRequired: z.boolean(),
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
			pushedAt
			archivedAt
			isArchived
			isFork
			isInOrganization
			isMirror
			isPrivate
			isTemplate
			diskUsage
			stargazerCount
			forkCount
			hasWikiEnabled
			hasDiscussionsEnabled
			hasIssuesEnabled
			hasSponsorshipsEnabled
			isSecurityPolicyEnabled
			autoMergeAllowed
			allowUpdateBranch
			deleteBranchOnMerge
			forkingAllowed
			mergeCommitAllowed
			rebaseMergeAllowed
			squashMergeAllowed
			webCommitSignoffRequired
			codeOfConduct { name }
			contributingGuidelines { body }
			fundingLinks { platform url }
			licenseInfo { spdxId }
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
			discussions { totalCount }
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

// eslint-disable-next-line complexity
function mapRepoData(
	data: GitHubRepoData,
	extras: { commitsBehindUpstream?: number; hasPages: boolean },
): GitHubData {
	const releaseDownloadCount =
		data.latestRelease?.releaseAssets.nodes.reduce((sum, asset) => sum + asset.downloadCount, 0) ??
		0

	return {
		archivedAt: data.archivedAt ?? undefined,
		branchDefault: data.defaultBranchRef?.name ?? undefined,
		codeOfConduct: data.codeOfConduct?.name ?? undefined,
		commitsBehindUpstream: extras.commitsBehindUpstream,
		contributorCount: data.contributorCount,
		createdAt: data.createdAt,
		description: data.description ?? undefined,
		discussionCount: data.discussions.totalCount,
		diskUsageKb: data.diskUsage ?? undefined,
		forkCount: data.forkCount,
		fundingLinks:
			data.fundingLinks.length > 0
				? data.fundingLinks.map((link) => ({ platform: link.platform, url: link.url }))
				: undefined,
		hasContributing: data.contributingGuidelines !== null,
		hasDiscussions: data.hasDiscussionsEnabled,
		hasIssues: data.hasIssuesEnabled,
		hasLfs: detectLfs(data.gitattributes?.text ?? undefined),
		hasPages: extras.hasPages,
		hasSecurityPolicy: data.isSecurityPolicyEnabled,
		hasSponsorships: data.hasSponsorshipsEnabled,
		hasWiki: data.hasWikiEnabled,
		homepage: data.homepageUrl === '' ? undefined : (data.homepageUrl ?? undefined),
		isArchived: data.isArchived,
		isFork: data.isFork,
		isInOrganization: data.isInOrganization,
		isMirror: data.isMirror,
		isPrivate: data.isPrivate,
		issueCountClosed: data.closedIssues.totalCount,
		issueCountOpen: data.openIssues.totalCount,
		isTemplate: data.isTemplate,
		languagePrimary: data.primaryLanguage?.name ?? undefined,
		languages: extractLanguages(data),
		license: undefined, // License from GitHub requires REST; codemeta already provides this
		licenseSpdxId: data.licenseInfo?.spdxId ?? undefined,
		ownerLogin: data.owner.login,
		pullRequestCountClosed: data.closedPullRequests.totalCount,
		pullRequestCountMerged: data.mergedPullRequests.totalCount,
		pullRequestCountOpen: data.openPullRequests.totalCount,
		pushedAt: data.pushedAt ?? undefined,
		releaseCount: data.releases.totalCount,
		releaseDateLatest: data.latestRelease?.createdAt ?? undefined,
		releaseDownloadCount,
		releaseVersionLatest: data.latestRelease?.tagName ?? undefined,
		repoName: data.name,
		repoUrl: data.url,
		settings: {
			allowAutoMerge: data.autoMergeAllowed,
			allowForking: data.forkingAllowed,
			allowUpdateBranch: data.allowUpdateBranch,
			deleteBranchOnMerge: data.deleteBranchOnMerge,
			mergeCommitAllowed: data.mergeCommitAllowed,
			rebaseMergeAllowed: data.rebaseMergeAllowed,
			squashMergeAllowed: data.squashMergeAllowed,
			webCommitSignoffRequired: data.webCommitSignoffRequired,
		},
		stargazerCount: data.stargazerCount,
		submoduleCount: countSubmodules(data.gitmodules?.text ?? undefined),
		topics: data.repositoryTopics.nodes.map((n) => n.topic.name),
		updatedAt: data.updatedAt,
		vulnerabilityAlertCount: data.vulnerabilityAlerts?.totalCount ?? undefined,
		watcherCount: data.watchers.totalCount,
	}
}

export const githubSource: MetadataSource<'github'> = {
	async extract(context: SourceContext): Promise<GitHubData> {
		log.debug('Extracting GitHub metadata...')
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
