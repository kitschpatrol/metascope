/* eslint-disable complexity */
/* eslint-disable unicorn/no-null */
/* eslint-disable ts/naming-convention */

import { defineTemplate } from '../metadata-types'
import {
	firstOf,
	mixedStringsToArray,
	REPLACEMENTS,
	toAlias,
	toLocalUrl,
	toMb,
} from '../utilities/formatting'
import {
	toBasicLicenses,
	basicNames as toBasicNames,
	getStatus as toStatus,
	usesSharedConfig,
} from '../utilities/template-helpers'

/**
 * A compact, non-nested, polyglot overview of the project.
 * Designed for Obsidian frontmatter — flat keys with natural language names,
 * blending all available sources into a single trackable snapshot.
 */
export const frontmatter = defineTemplate(
	(
		{
			codemetaJson: codemetaRaw,
			codeStatistics: loc,
			dependencyUpdates,
			fileStatistics: filesystem,
			github,
			gitStatistics: git,
			metascope,
			nodeNpmRegistry: npm,
			obsidianPluginManifestJson: obsidianPluginManifestJsonRaw,
			obsidianPluginRegistry: obsidianRegistry,
			pythonPypiRegistry: pypi,
		},
		{ authorName, githubAccount },
	) => {
		const codemeta = firstOf(codemetaRaw)
		const obsidianPluginManifestJson = firstOf(obsidianPluginManifestJsonRaw)

		return {
			/* eslint-disable perfectionist/sort-objects */

			// ── Identity ──────────────────────────────────────────
			Name: codemeta?.data.name ?? null,
			alias: toAlias(codemeta?.data.name) ?? null, // Obsidian special field
			Description: codemeta?.data.description ?? github?.data.description ?? null,
			Author:
				mixedStringsToArray(
					toBasicNames(codemeta?.data.author),
					new Map<string, string>([['Eric Mika', '[Eric Mika](/Contacts/Eric%20Mika)']]),
				) ?? null,
			Version: codemeta?.data.version ?? null,
			Public: !(github?.data.isPrivate ?? false),
			Published: Boolean(obsidianRegistry?.data.url ?? npm?.data.url ?? pypi?.data.url),
			Status: toStatus(codemeta, authorName, githubAccount) ?? null,
			'GitHub Owner': github?.data.ownerLogin ?? null,
			tags: codemeta?.data.keywords ?? [], // Obsidian special field
			License: toBasicLicenses(codemeta?.data.license ?? github?.data.licenseSpdxId) ?? null,
			Languages:
				mixedStringsToArray(
					codemeta?.data.programmingLanguage ?? github?.data.primaryLanguage,
					REPLACEMENTS,
				) ?? null,

			// ── Local Repo ─────────────────────────────────────────────
			'Repo Path':
				metascope?.data.options.path === undefined ? null : `file://${metascope.data.options.path}`,
			'Readme Path': toLocalUrl(codemeta?.data.readme, metascope?.data.options.path) ?? null,
			'VS Code Path':
				metascope?.data.options.path === undefined
					? null
					: `vscode://file/${metascope.data.options.path}`,

			// ── Links ─────────────────────────────────────────────
			'Homepage URL':
				codemeta?.data.url !== undefined && !codemeta.data.url.startsWith('https://github.com/')
					? codemeta.data.url
					: null,
			'Repo URL': codemeta?.data.codeRepository ?? github?.data.url ?? null,
			'Package URL': obsidianRegistry?.data.url ?? npm?.data.url ?? pypi?.data.url ?? null,
			'Readme URL': codemeta?.data.readme ?? null,
			'Issues URL': codemeta?.data.issueTracker ?? null,

			// ── Timeline ──────────────────────────────────────────
			Created:
				codemeta?.data.dateCreated ?? git?.data.commitDateFirst ?? github?.data.createdAt ?? null,
			'First Commit Date': git?.data.commitDateFirst ?? null,
			'Latest Commit Date': git?.data.commitDateLast ?? null,
			'Latest Push Date': github?.data.pushedAt ?? null,
			// 'Last Updated': github.updatedAt,
			'Latest Release Date':
				github?.data.releaseDateLatest ??
				npm?.data.publishDateLatest ??
				pypi?.data.publishDateLatest ??
				git?.data.tagVersionDateLatest ??
				null,
			'Latest Release Version':
				obsidianPluginManifestJson?.data.version ??
				npm?.data.versionLatest ??
				pypi?.data.versionLatest ??
				github?.data.releaseVersionLatest ??
				git?.data.tagVersionLatest ??
				null,

			// ── Popularity ────────────────────────────────────────
			Stars: github?.data.stargazerCount ?? null,
			Watchers: github?.data.watcherCount ?? null,
			Contributors: github?.data.contributorCount ?? git?.data.contributorCount ?? null,
			Forks: github?.data.forkCount ?? null,
			'Downloads Total':
				obsidianRegistry?.data.downloadCount ??
				npm?.data.downloadsTotal ??
				pypi?.data.downloads180Days ??
				github?.data.releaseDownloadCount ??
				null,
			'Downloads Monthly': npm?.data.downloadsMonthly ?? pypi?.data.downloadsMonthly ?? null,

			// ── Activity ──────────────────────────────────────────
			Commits: git?.data.commitCount ?? null,
			Releases: github?.data.releaseCount ?? git?.data.tagReleaseCount,
			'Issues Open': github?.data.issueCountOpen ?? null,
			'Issues Closed': github?.data.issueCountClosed ?? null,
			'PRs Open': github?.data.pullRequestCountOpen ?? null,
			'PRs Merged': github?.data.pullRequestCountMerged ?? null,
			'PRs Closed': github?.data.pullRequestCountClosed ?? null,
			'Vulnerability Alerts': github?.data.vulnerabilityAlertCount ?? null,

			// ── Codebase ──────────────────────────────────────────
			'Lines of Code': firstOf(loc)?.data.total?.code ?? null,
			'Total Files': filesystem?.data.totalFileCount ?? null,
			// 'Total Directories': filesystem?.data.totalDirectoryCount ?? null,
			'Total Size MB': toMb(filesystem?.data.totalSizeBytes) ?? null,
			'Tracked Files': git?.data.trackedFileCount ?? null,
			'Tracked Size MB': toMb(git?.data.trackedSizeBytes) ?? null,
			'GitHub Size MB': toMb(github?.data.diskUsageBytes) ?? null,

			// ── Dependencies ──────────────────────────────────────────
			Runtime: codemeta?.data.runtimePlatform ?? null,
			'Operating System': codemeta?.data.operatingSystem ?? null,
			Dependencies: codemeta?.data.softwareRequirements?.length ?? 0,
			'Dev Dependencies': codemeta?.data.softwareSuggestions?.length ?? 0,
			'Major Updates': dependencyUpdates?.data.major?.length ?? 0,
			'Minor Updates': dependencyUpdates?.data.minor?.length ?? 0,
			'Patch Updates': dependencyUpdates?.data.patch?.length ?? 0,
			'Total Updates': dependencyUpdates?.extra?.total ?? 0,
			Libyears: dependencyUpdates?.extra?.libyears ?? 0,
			// 'Uses PNPM': usesPnpm(packageJson),
			'Shared Config': usesSharedConfig(codemeta),

			// ── Project Health ────────────────────────────────────
			// 'Has Contributing': github.hasContributing,
			// 'Has Security Policy': github.isSecurityPolicyEnabled,
			// 'Code of Conduct': github.codeOfConduct,
			// 'Has Sponsorships': github.hasSponsorshipsEnabled,
			// 'Funding Links': github.fundingLinks?.map((l) => `${l.platform}: ${l.url}`),

			// ── Flags ─────────────────────────────────────────────
			// Archived: github.isArchived ?? false,
			Archived: github?.data.archivedAt ?? null,
			// Fork: github?.data.isFork ?? false,
			'Forked From': github?.data.forkedFrom ?? null,
			'Fork Ahead': github?.data.commitsAheadUpstream ?? null,
			'Fork Behind': github?.data.commitsBehindUpstream ?? null,
			// Mirror: github?.data.isMirror ?? false,
			'Mirrored From': github?.data.mirrorUrl ?? null,
			'Template From': github?.data.templateFrom ?? null,
			'Template Repo': github?.data.isTemplate ?? false,
			Organization: github?.data.isInOrganization ?? false,
			// 'Has Wiki': github.hasWikiEnabled,
			// 'Has Pages': github.hasPages,
			// 'Has Discussions': github.hasDiscussionsEnabled,
			// 'Issues': github.hasIssuesEnabled,

			// ── Git Status ────────────────────────────────────────
			'Dirty Files': git?.data.uncommittedFileCount ?? null,
			'Remotes Ahead': git?.data.totalAhead ?? null,
			'Remotes Behind': git?.data.totalBehind ?? null,
			'Git LFS': git?.data.hasLfs ?? github?.data.hasLfs ?? false,
			// 'Git Clean': git?.data.isClean ?? null,
			'Git Tags': git?.data.tagCount ?? null,
			'Git Current Branch': git?.data.branchCurrent ?? null,
			'Git Branches': git?.data.branchCount ?? null,
			'Git Remotes': git?.data.remoteCount ?? null,
			'Git Submodules': git?.data.submoduleCount ?? 0,

			// ── Settings ──────────────────────────────────────────
			// 'Allow Auto Merge': github.settings?.autoMergeAllowed,
			// 'Allow Forking': github.settings?.forkingAllowed,
			// 'Delete Branch on Merge': github.settings?.deleteBranchOnMerge,
			// 'Squash Merge Allowed': github.settings?.squashMergeAllowed,
			// 'Rebase Merge Allowed': github.settings?.rebaseMergeAllowed,
			// 'Merge Commit Allowed': github.settings?.mergeCommitAllowed,

			// ── Meta ──────────────────────────────────────────────
			'Metadata Scanned': metascope?.data.scannedAt ?? null,

			/* eslint-enable perfectionist/sort-objects */
		}
	},
)
