/* eslint-disable ts/naming-convention */
/* eslint-disable unicorn/no-null */

/**
 * Minimal GitHub API response fixtures.
 * GraphQL response conforms to gitHubRepoSchema in src/lib/sources/github.ts.
 * REST response conforms to what octokit.rest.repos.get returns.
 */

/** GitHub GraphQL responses keyed by "owner/repo" */
export const githubGraphql: Record<string, unknown> = {
	'kitschpatrol/metascope': {
		repository: {
			allowUpdateBranch: true,
			archivedAt: null,
			autoMergeAllowed: false,
			closedIssues: { totalCount: 5 },
			closedPullRequests: { totalCount: 10 },
			codeOfConduct: null,
			contributingGuidelines: null,
			createdAt: '2024-01-15T10:00:00Z',
			databaseId: 123_456,
			defaultBranchRef: { name: 'main' },
			deleteBranchOnMerge: true,
			description: 'Extract comprehensive metadata from any software project.',
			discussions: { totalCount: 0 },
			diskUsage: 1500,
			forkCount: 2,
			forkingAllowed: true,
			fundingLinks: [],
			gitattributes: null,
			gitmodules: null,
			hasDiscussionsEnabled: false,
			hasIssuesEnabled: true,
			hasProjectsEnabled: false,
			hasSponsorshipsEnabled: false,
			hasVulnerabilityAlertsEnabled: true,
			hasWikiEnabled: false,
			homepageUrl: null,
			isArchived: false,
			isDisabled: false,
			isFork: false,
			isInOrganization: false,
			isMirror: false,
			isPrivate: false,
			isSecurityPolicyEnabled: false,
			isTemplate: false,
			languages: {
				edges: [
					{ node: { name: 'TypeScript' }, size: 200_000 },
					{ node: { name: 'JavaScript' }, size: 5000 },
				],
			},
			latestRelease: {
				createdAt: '2025-03-01T12:00:00Z',
				releaseAssets: { nodes: [{ downloadCount: 50 }] },
				tagName: 'v0.2.2',
			},
			licenseInfo: {
				key: 'mit',
				name: 'MIT License',
				spdxId: 'MIT',
				url: 'https://opensource.org/licenses/MIT',
			},
			mergeCommitAllowed: true,
			mergeCommitMessage: 'PR_BODY',
			mergeCommitTitle: 'PR_TITLE',
			mergedPullRequests: { totalCount: 8 },
			mirrorUrl: null,
			name: 'metascope',
			nameWithOwner: 'kitschpatrol/metascope',
			openGraphImageUrl: 'https://opengraph.githubassets.com/metascope',
			openIssues: { totalCount: 3 },
			openPullRequests: { totalCount: 1 },
			owner: { __typename: 'User', login: 'kitschpatrol' },
			parent: null,
			primaryLanguage: { name: 'TypeScript' },
			pushedAt: '2025-03-01T12:00:00Z',
			rebaseMergeAllowed: true,
			releases: { totalCount: 5 },
			repositoryTopics: {
				nodes: [{ topic: { name: 'metadata' } }, { topic: { name: 'typescript' } }],
			},
			securityPolicyUrl: null,
			squashMergeAllowed: true,
			squashMergeCommitMessage: 'COMMIT_MESSAGES',
			squashMergeCommitTitle: 'PR_TITLE',
			sshUrl: 'git@github.com:kitschpatrol/metascope.git',
			stargazerCount: 25,
			templateRepository: null,
			updatedAt: '2025-03-01T12:00:00Z',
			url: 'https://github.com/kitschpatrol/metascope',
			usesCustomOpenGraphImage: false,
			visibility: 'PUBLIC',
			vulnerabilityAlerts: { totalCount: 0 },
			watchers: { totalCount: 10 },
			webCommitSignoffRequired: false,
		},
	},
}

/** GitHub REST repos.get responses keyed by "owner/repo" */
export const githubRest: Record<string, { default_branch: string; has_pages: boolean }> = {
	'kitschpatrol/metascope': { default_branch: 'main', has_pages: false },
}

/** GitHub REST actions/runs responses keyed by "owner/repo" */
export const githubActionsRuns: Record<
	string,
	{
		total_count: number
		workflow_runs: Array<{
			conclusion: string
			html_url: string
			path: string
			run_started_at: string
			status: string
			updated_at: string
		}>
	}
> = {
	'kitschpatrol/metascope': {
		total_count: 3,
		workflow_runs: [
			{
				conclusion: 'success',
				html_url: 'https://github.com/kitschpatrol/metascope/actions/runs/12345',
				path: '.github/workflows/ci.yml',
				run_started_at: '2025-03-01T12:00:00Z',
				status: 'completed',
				updated_at: '2025-03-01T12:05:30Z',
			},
			{
				conclusion: 'success',
				html_url: 'https://github.com/kitschpatrol/metascope/actions/runs/12344',
				path: '.github/workflows/github-release.yml',
				run_started_at: '2025-02-28T10:00:00Z',
				status: 'completed',
				updated_at: '2025-02-28T10:02:15Z',
			},
			{
				conclusion: 'success',
				html_url: 'https://github.com/kitschpatrol/metascope/actions/runs/12343',
				path: '.github/workflows/set-github-metadata.yml',
				run_started_at: '2025-03-01T12:00:00Z',
				status: 'completed',
				updated_at: '2025-03-01T12:00:45Z',
			},
		],
	},
}
