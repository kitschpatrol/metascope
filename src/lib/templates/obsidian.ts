/* eslint-disable complexity */
/* eslint-disable unicorn/no-null */
/* eslint-disable ts/naming-convention */

import { defineTemplate } from '../metadata-types'
import {
	mixedStringsToArray,
	REPLACEMENTS,
	toAlias,
	basicLicense as toBasicLicense,
	basicNames as toBasicNames,
	toLocalUrl,
	toMb,
	getStatus as toStatus,
	usesSharedConfig,
} from '../utilities'

/**
 * A compact, non-nested, polyglot overview of the project.
 * Designed for Obsidian frontmatter — flat keys with natural language names,
 * blending all available sources into a single trackable snapshot.
 */
export const obsidian = defineTemplate(
	(
		{ codemeta, filesystem, git, github, loc, metascope, npm, obsidian, pypi, updates },
		{ authorName, githubAccount },
	) => ({
		/* eslint-disable perfectionist/sort-objects */

		// ── Identity ──────────────────────────────────────────
		Name: codemeta.name ?? null,
		alias: toAlias(codemeta.name) ?? null, // Obsidian special field
		Description: codemeta.description ?? github.description ?? null,
		Author:
			mixedStringsToArray(
				toBasicNames(codemeta.author),
				new Map<string, string>([['Eric Mika', '[Eric Mika](/Contacts/Eric%20Mika)']]),
			) ?? null,
		Version: codemeta.version ?? null,
		Public: !(github.isPrivate ?? false),
		Published: Boolean(obsidian.url ?? npm.url ?? pypi.url),
		Status: toStatus(codemeta, authorName, githubAccount) ?? null,
		'GitHub Owner': github.ownerLogin ?? null,
		tags: codemeta.keywords ?? [], // Obsidian special field
		License: toBasicLicense(codemeta.license ?? github.licenseSpdxId) ?? null,
		Languages:
			mixedStringsToArray(codemeta.programmingLanguage ?? github.primaryLanguage, REPLACEMENTS) ??
			null,

		// ── Local Repo ─────────────────────────────────────────────
		'Repo Path': metascope.path === undefined ? null : `file://${metascope.path}`,
		'Readme Path': toLocalUrl(codemeta.readme, metascope.path) ?? null,
		'VS Code Path': metascope.path === undefined ? null : `vscode://file/${metascope.path}`,

		// ── Links ─────────────────────────────────────────────
		'Homepage URL':
			codemeta.url !== undefined && !codemeta.url.startsWith('https://github.com/')
				? codemeta.url
				: null,
		'Repo URL': codemeta.codeRepository ?? github.url ?? null,
		'Package URL': obsidian.url ?? npm.url ?? pypi.url ?? null,
		'Readme URL': codemeta.readme ?? null,
		'Issues URL': codemeta.issueTracker ?? null,

		// ── Timeline ──────────────────────────────────────────
		Created: codemeta.dateCreated ?? git.commitDateFirst ?? github.createdAt ?? null,
		'First Commit Date': git.commitDateFirst ?? null,
		'Latest Commit Date': git.commitDateLast ?? null,
		'Latest Push Date': github.pushedAt ?? null,
		// 'Last Updated': github.updatedAt,
		'Latest Release Date':
			github.releaseDateLatest ??
			npm.publishDateLatest ??
			pypi.publishDateLatest ??
			git.tagVersionDateLatest ??
			null,
		'Latest Release Version':
			obsidian.manifest?.version ??
			npm.versionLatest ??
			pypi.versionLatest ??
			github.releaseVersionLatest ??
			git.tagVersionLatest ??
			null,

		// ── Popularity ────────────────────────────────────────
		Stars: github.stargazerCount ?? null,
		Watchers: github.watcherCount ?? null,
		Contributors: github.contributorCount ?? git.contributorCount ?? null,
		Forks: github.forkCount ?? null,
		'Downloads Total':
			obsidian.downloadCount ??
			npm.downloadsTotal ??
			pypi.downloads180Days ??
			github.releaseDownloadCount ??
			null,
		'Downloads Monthly': npm.downloadsMonthly ?? pypi.downloadsMonthly ?? null,

		// ── Activity ──────────────────────────────────────────
		Commits: git.commitCount ?? null,
		Releases: github.releaseCount ?? git.tagReleaseCount,
		'Issues Open': github.issueCountOpen ?? null,
		'Issues Closed': github.issueCountClosed ?? null,
		'PRs Open': github.pullRequestCountOpen ?? null,
		'PRs Merged': github.pullRequestCountMerged ?? null,
		'PRs Closed': github.pullRequestCountClosed ?? null,
		'Vulnerability Alerts': github.vulnerabilityAlertCount ?? null,

		// ── Codebase ──────────────────────────────────────────
		'Lines of Code': loc.total?.code ?? null,
		'Total Files': filesystem.totalFileCount ?? null,
		// 'Total Directories': filesystem.totalDirectoryCount ?? null,
		'Total Size MB': toMb(filesystem.totalSizeBytes) ?? null,
		'Tracked Files': git.trackedFileCount ?? null,
		'Tracked Size MB': toMb(git.trackedSizeBytes) ?? null,
		'GitHub Size MB': toMb(github.diskUsageBytes) ?? null,

		// ── Dependencies ──────────────────────────────────────────
		Runtime: codemeta.runtimePlatform ?? null,
		'Operating System': codemeta.operatingSystem ?? null,
		Dependencies: codemeta.softwareRequirements?.length ?? 0,
		'Dev Dependencies': codemeta.softwareSuggestions?.length ?? 0,
		'Major Updates': updates.major?.length ?? 0,
		'Minor Updates': updates.minor?.length ?? 0,
		'Patch Updates': updates.patch?.length ?? 0,
		'Total Updates': updates.total ?? 0,
		Libyears: updates.libyears ?? 0,
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
		Archived: github.archivedAt ?? null,
		// Fork: github.isFork ?? false,
		'Forked From': github.forkedFrom ?? null,
		'Fork Ahead': github.commitsAheadUpstream ?? null,
		'Fork Behind': github.commitsBehindUpstream ?? null,
		// Mirror: github.isMirror ?? false,
		'Mirrored From': github.mirrorUrl ?? null,
		'Template From': github.templateFrom ?? null,
		'Template Repo': github.isTemplate ?? false,
		Organization: github.isInOrganization ?? false,
		// 'Has Wiki': github.hasWikiEnabled,
		// 'Has Pages': github.hasPages,
		// 'Has Discussions': github.hasDiscussionsEnabled,
		// 'Issues': github.hasIssuesEnabled,

		// ── Git Status ────────────────────────────────────────
		'Dirty Files': git.uncommittedFileCount ?? null,
		'Remotes Ahead': git.totalAhead ?? null,
		'Remotes Behind': git.totalBehind ?? null,
		'Git LFS': git.hasLfs ?? github.hasLfs ?? false,
		// 'Git Clean': git.isClean ?? null,
		'Git Tags': git.tagCount ?? null,
		'Git Current Branch': git.branchCurrent ?? null,
		'Git Branches': git.branchCount ?? null,
		'Git Remotes': git.remoteCount ?? null,
		'Git Submodules': git.submoduleCount ?? 0,

		// ── Settings ──────────────────────────────────────────
		// 'Allow Auto Merge': github.settings?.autoMergeAllowed,
		// 'Allow Forking': github.settings?.forkingAllowed,
		// 'Delete Branch on Merge': github.settings?.deleteBranchOnMerge,
		// 'Squash Merge Allowed': github.settings?.squashMergeAllowed,
		// 'Rebase Merge Allowed': github.settings?.rebaseMergeAllowed,
		// 'Merge Commit Allowed': github.settings?.mergeCommitAllowed,

		// ── Meta ──────────────────────────────────────────────
		'Metadata Scanned': metascope.scannedAt ?? null,

		/* eslint-enable perfectionist/sort-objects */
	}),
)
