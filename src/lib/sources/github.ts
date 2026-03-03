import gitUrlParse from 'git-url-parse'
import { Octokit } from 'octokit'
import git from 'simple-git'
import { z } from 'zod'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'

export type GitHubData = {
	archivedAt?: string
	codeOfConduct?: string
	commitsAheadUpstream?: number
	commitsBehindUpstream?: number
	contributorCount?: number
	createdAt?: string
	databaseId?: number
	defaultBranch?: string
	description?: string
	discussionCount?: number
	diskUsageBytes?: number
	forkCount?: number
	forkedFrom?: string
	fundingLinks?: Array<{ platform: string; url: string }>
	hasContributing?: boolean
	hasDiscussionsEnabled?: boolean
	hasIssuesEnabled?: boolean
	hasLfs?: boolean
	hasPages?: boolean
	hasProjectsEnabled?: boolean
	hasSponsorshipsEnabled?: boolean
	hasVulnerabilityAlertsEnabled?: boolean
	hasWikiEnabled?: boolean
	homepageUrl?: string
	isArchived?: boolean
	isDisabled?: boolean
	isFork?: boolean
	isInOrganization?: boolean
	isMirror?: boolean
	isPrivate?: boolean
	isSecurityPolicyEnabled?: boolean
	issueCountClosed?: number
	issueCountOpen?: number
	isTemplate?: boolean
	languages?: Record<string, number>
	license?: string
	licenseKey?: string
	licenseName?: string
	licenseSpdxId?: string
	licenseUrl?: string
	mirrorUrl?: string
	name?: string
	nameWithOwner?: string
	openGraphImageUrl?: string
	ownerLogin?: string
	ownerType?: string
	parentNameWithOwner?: string
	primaryLanguage?: string
	pullRequestCountClosed?: number
	pullRequestCountMerged?: number
	pullRequestCountOpen?: number
	pushedAt?: string
	releaseCount?: number
	releaseDateLatest?: string
	releaseDownloadCount?: number
	releaseVersionLatest?: string
	securityPolicyUrl?: string
	settings?: {
		allowUpdateBranch?: boolean
		autoMergeAllowed?: boolean
		deleteBranchOnMerge?: boolean
		forkingAllowed?: boolean
		mergeCommitAllowed?: boolean
		mergeCommitMessage?: string
		mergeCommitTitle?: string
		rebaseMergeAllowed?: boolean
		squashMergeAllowed?: boolean
		squashMergeCommitMessage?: string
		squashMergeCommitTitle?: string
		webCommitSignoffRequired?: boolean
	}
	sshUrl?: string
	stargazerCount?: number
	submoduleCount?: number
	templateFrom?: string
	topics?: string[]
	updatedAt?: string
	url?: string
	usesCustomOpenGraphImage?: boolean
	visibility?: string
	vulnerabilityAlertCount?: number
	watcherCount?: number
}

const gitHubRepoSchema = z.object({
	repository: z.object({
		allowUpdateBranch: z.boolean(),
		archivedAt: z.string().nullable(),
		autoMergeAllowed: z.boolean(),
		closedIssues: z.object({ totalCount: z.number() }),
		closedPullRequests: z.object({ totalCount: z.number() }),
		codeOfConduct: z.object({ name: z.string() }).nullable(),
		contributingGuidelines: z.object({ body: z.string() }).nullable(),
		contributorCount: z.number().optional(),
		createdAt: z.string(),
		databaseId: z.number(),
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
		hasProjectsEnabled: z.boolean(),
		hasSponsorshipsEnabled: z.boolean(),
		hasVulnerabilityAlertsEnabled: z.boolean(),
		hasWikiEnabled: z.boolean(),
		homepageUrl: z.string().nullable(),
		isArchived: z.boolean(),
		isDisabled: z.boolean(),
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
		licenseInfo: z
			.object({
				key: z.string(),
				name: z.string(),
				spdxId: z.string().nullable(),
				url: z.string().nullable(),
			})
			.nullable(),
		mergeCommitAllowed: z.boolean(),
		mergeCommitMessage: z.string(),
		mergeCommitTitle: z.string(),
		mergedPullRequests: z.object({ totalCount: z.number() }),
		mirrorUrl: z.string().nullable(),
		name: z.string(),
		nameWithOwner: z.string(),
		openGraphImageUrl: z.string(),
		openIssues: z.object({ totalCount: z.number() }),
		openPullRequests: z.object({ totalCount: z.number() }),
		owner: z.object({ __typename: z.string(), login: z.string() }),
		parent: z
			.object({
				defaultBranchRef: z.object({ name: z.string() }).nullable(),
				name: z.string(),
				nameWithOwner: z.string(),
				owner: z.object({ login: z.string() }),
				url: z.string(),
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
		securityPolicyUrl: z.string().nullable(),
		squashMergeAllowed: z.boolean(),
		squashMergeCommitMessage: z.string(),
		squashMergeCommitTitle: z.string(),
		sshUrl: z.string(),
		stargazerCount: z.number(),
		templateRepository: z
			.object({
				name: z.string(),
				owner: z.object({ login: z.string() }),
				url: z.string(),
			})
			.nullable(),
		updatedAt: z.string(),
		url: z.string(),
		usesCustomOpenGraphImage: z.boolean(),
		visibility: z.string(),
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

		// Prefer "origin" remote, fall back to first GitHub remote
		const sorted = [...remotes].sort((a, b) => {
			if (a.name === 'origin') return -1
			if (b.name === 'origin') return 1
			return 0
		})

		for (const remote of sorted) {
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
			nameWithOwner
			owner { __typename login }
			url
			description
			homepageUrl
			createdAt
			updatedAt
			pushedAt
			archivedAt
			databaseId
			isArchived
			isDisabled
			isFork
			isInOrganization
			isMirror
			isPrivate
			isTemplate
			visibility
			diskUsage
			stargazerCount
			forkCount
			sshUrl
			hasWikiEnabled
			hasDiscussionsEnabled
			hasIssuesEnabled
			hasProjectsEnabled
			hasSponsorshipsEnabled
			hasVulnerabilityAlertsEnabled
			isSecurityPolicyEnabled
			securityPolicyUrl
			openGraphImageUrl
			usesCustomOpenGraphImage
			autoMergeAllowed
			allowUpdateBranch
			deleteBranchOnMerge
			forkingAllowed
			mergeCommitAllowed
			mergeCommitMessage
			mergeCommitTitle
			mirrorUrl
			rebaseMergeAllowed
			squashMergeAllowed
			squashMergeCommitMessage
			squashMergeCommitTitle
			webCommitSignoffRequired
			codeOfConduct { name }
			contributingGuidelines { body }
			fundingLinks { platform url }
			licenseInfo { key name spdxId url }
			defaultBranchRef { name }
			primaryLanguage { name }
			parent {
				owner { login }
				name
				nameWithOwner
				url
				defaultBranchRef { name }
			}
			templateRepository {
				owner { login }
				name
				url
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

async function getUpstreamComparison(
	octokit: Octokit,
	owner: string,
	repo: string,
	defaultBranch: string,
	parent: NonNullable<GitHubRepoData['parent']>,
): Promise<{ ahead: number; behind: number } | undefined> {
	const parentBranch = parent.defaultBranchRef?.name
	if (!parentBranch) return undefined

	try {
		const response = await octokit.rest.repos.compareCommitsWithBasehead({
			basehead: `${parent.owner.login}:${parentBranch}...${owner}:${defaultBranch}`,
			owner,
			repo,
		})
		return { ahead: response.data.ahead_by, behind: response.data.behind_by }
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
	extras: { commitsAheadUpstream?: number; commitsBehindUpstream?: number; hasPages: boolean },
): GitHubData {
	const releaseDownloadCount =
		data.latestRelease?.releaseAssets.nodes.reduce((sum, asset) => sum + asset.downloadCount, 0) ??
		0

	return {
		archivedAt: data.archivedAt ?? undefined,
		codeOfConduct: data.codeOfConduct?.name ?? undefined,
		commitsAheadUpstream: extras.commitsAheadUpstream,
		commitsBehindUpstream: extras.commitsBehindUpstream,
		contributorCount: data.contributorCount,
		createdAt: data.createdAt,
		databaseId: data.databaseId,
		defaultBranch: data.defaultBranchRef?.name ?? undefined,
		description: data.description ?? undefined,
		discussionCount: data.discussions.totalCount,
		diskUsageBytes: data.diskUsage === null ? undefined : data.diskUsage * 1024,
		forkCount: data.forkCount,
		forkedFrom: data.parent?.url ?? undefined,
		fundingLinks:
			data.fundingLinks.length > 0
				? data.fundingLinks.map((link) => ({ platform: link.platform, url: link.url }))
				: undefined,
		hasContributing: data.contributingGuidelines !== null,
		hasDiscussionsEnabled: data.hasDiscussionsEnabled,
		hasIssuesEnabled: data.hasIssuesEnabled,
		hasLfs: detectLfs(data.gitattributes?.text ?? undefined),
		hasPages: extras.hasPages,
		hasProjectsEnabled: data.hasProjectsEnabled,
		hasSponsorshipsEnabled: data.hasSponsorshipsEnabled,
		hasVulnerabilityAlertsEnabled: data.hasVulnerabilityAlertsEnabled,
		hasWikiEnabled: data.hasWikiEnabled,
		homepageUrl: data.homepageUrl === '' ? undefined : (data.homepageUrl ?? undefined),
		isArchived: data.isArchived,
		isDisabled: data.isDisabled,
		isFork: data.isFork,
		isInOrganization: data.isInOrganization,
		isMirror: data.isMirror,
		isPrivate: data.isPrivate,
		isSecurityPolicyEnabled: data.isSecurityPolicyEnabled,
		issueCountClosed: data.closedIssues.totalCount,
		issueCountOpen: data.openIssues.totalCount,
		isTemplate: data.isTemplate,
		languages: extractLanguages(data),
		license: undefined, // License from GitHub requires REST; codemeta already provides this
		licenseKey: data.licenseInfo?.key ?? undefined,
		licenseName: data.licenseInfo?.name ?? undefined,
		licenseSpdxId: data.licenseInfo?.spdxId ?? undefined,
		licenseUrl: data.licenseInfo?.url ?? undefined,
		mirrorUrl: data.mirrorUrl ?? undefined,
		name: data.name,
		nameWithOwner: data.nameWithOwner,
		openGraphImageUrl: data.openGraphImageUrl,
		ownerLogin: data.owner.login,
		ownerType: data.owner.__typename,
		parentNameWithOwner: data.parent?.nameWithOwner ?? undefined,
		primaryLanguage: data.primaryLanguage?.name ?? undefined,
		pullRequestCountClosed: data.closedPullRequests.totalCount,
		pullRequestCountMerged: data.mergedPullRequests.totalCount,
		pullRequestCountOpen: data.openPullRequests.totalCount,
		pushedAt: data.pushedAt ?? undefined,
		releaseCount: data.releases.totalCount,
		releaseDateLatest: data.latestRelease?.createdAt ?? undefined,
		releaseDownloadCount,
		releaseVersionLatest: data.latestRelease?.tagName ?? undefined,
		securityPolicyUrl: data.securityPolicyUrl ?? undefined,
		settings: {
			allowUpdateBranch: data.allowUpdateBranch,
			autoMergeAllowed: data.autoMergeAllowed,
			deleteBranchOnMerge: data.deleteBranchOnMerge,
			forkingAllowed: data.forkingAllowed,
			mergeCommitAllowed: data.mergeCommitAllowed,
			mergeCommitMessage: data.mergeCommitMessage,
			mergeCommitTitle: data.mergeCommitTitle,
			rebaseMergeAllowed: data.rebaseMergeAllowed,
			squashMergeAllowed: data.squashMergeAllowed,
			squashMergeCommitMessage: data.squashMergeCommitMessage,
			squashMergeCommitTitle: data.squashMergeCommitTitle,
			webCommitSignoffRequired: data.webCommitSignoffRequired,
		},
		sshUrl: data.sshUrl,
		stargazerCount: data.stargazerCount,
		submoduleCount: countSubmodules(data.gitmodules?.text ?? undefined),
		templateFrom: data.templateRepository?.url ?? undefined,
		topics: data.repositoryTopics.nodes.map((n) => n.topic.name),
		updatedAt: data.updatedAt,
		url: data.url,
		usesCustomOpenGraphImage: data.usesCustomOpenGraphImage,
		visibility: data.visibility,
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

		// If the repo is a fork, check how many commits ahead/behind upstream
		let commitsAheadUpstream: number | undefined
		let commitsBehindUpstream: number | undefined
		if (data.isFork && data.parent && data.defaultBranchRef) {
			const comparison = await getUpstreamComparison(
				octokit,
				owner,
				repo,
				data.defaultBranchRef.name,
				data.parent,
			)
			commitsAheadUpstream = comparison?.ahead
			commitsBehindUpstream = comparison?.behind
		}

		return mapRepoData(data, { commitsAheadUpstream, commitsBehindUpstream, hasPages })
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const remote = await getGitHubRemote(context.path)
		return remote !== undefined
	},
	key: 'github',
}
