/* eslint-disable complexity */
/* eslint-disable unicorn/no-null */
/* eslint-disable ts/naming-convention */

import { defineTemplate } from '../metadata-types'
import { codeMetaJsonDataSchema } from '../sources/codemeta-json'
import {
	dependencyNames,
	firstOf,
	isValidUrl,
	mixedStringsToArray,
	REPLACEMENTS,
	toAlias,
	toBasicLicenses,
	toBasicNames,
	toLocalUrl,
	toMb,
	toStatus,
} from '../utilities/template-helpers'
import { codemeta as codemetaTemplate } from './codemeta'

export type TemplateDataFrontmatter = ReturnType<typeof frontmatter>

/**
 * A compact, non-nested, polyglot overview of the project.
 * Designed for Obsidian frontmatter — flat keys with natural language names,
 * blending all available sources into a single trackable snapshot.
 */
export const frontmatter = defineTemplate((context, templateData) => {
	// Let the codemeta template do the heavy aggregation...
	const codemetaTemplateOutput = codemetaTemplate(context, templateData)
	const codemeta = codeMetaJsonDataSchema.parse(codemetaTemplateOutput)

	const codeStats = firstOf(context.codeStats)?.data
	const dependencyUpdates = firstOf(context.dependencyUpdates)
	const fileStats = firstOf(context.fileStats)?.data
	const github = firstOf(context.github)?.data
	const gitStats = firstOf(context.gitStats)?.data
	const metascope = context.metascope?.data
	const nodeNpmRegistry = firstOf(context.nodeNpmRegistry)?.data
	const obsidianPluginManifestJson = firstOf(context.obsidianPluginManifestJson)?.data
	const obsidianPluginRegistry = firstOf(context.obsidianPluginRegistry)?.data
	const pythonPypiRegistry = firstOf(context.pythonPypiRegistry)?.data

	const primaryLanguages =
		mixedStringsToArray(codemeta.programmingLanguage ?? github?.primaryLanguage, REPLACEMENTS) ??
		null
	const secondaryLanguages =
		mixedStringsToArray(codeStats?.total?.languages, REPLACEMENTS)?.filter(
			(value) => !primaryLanguages?.includes(value),
		) ?? null

	return {
		/* eslint-disable perfectionist/sort-objects */

		// ── Identity ──────────────────────────────────────────
		Name: codemeta.name ?? null,
		alias: toAlias(codemeta.name) ?? null, // Obsidian special field
		Description: codemeta.description ?? null,
		Author:
			mixedStringsToArray(
				toBasicNames(codemeta.author),
				new Map<string, string>([['Eric Mika', '[Eric Mika](/Contacts/Eric%20Mika)']]),
			) ?? null,
		Version: codemeta.version ?? null,
		Public: !(github?.isPrivate ?? false),
		Fork: github?.isFork ?? false,
		Published: Boolean(
			obsidianPluginRegistry?.url ?? nodeNpmRegistry?.url ?? pythonPypiRegistry?.url,
		),
		Status:
			toStatus(
				codemeta.codeRepository,
				codemeta.author,
				templateData.authorName,
				templateData.githubAccount,
			) ?? null,
		'GitHub Owner': github?.ownerLogin ?? null,
		tags: codemeta.keywords ?? null, // Obsidian special field
		License: toBasicLicenses(codemeta.license) ?? null,
		Language: primaryLanguages,
		'Secondary Language': secondaryLanguages,

		// ── Local Repo ─────────────────────────────────────────────
		'Repo Path': metascope?.options.path === undefined ? null : `file://${metascope.options.path}`,
		'VS Code Path':
			metascope?.options.path === undefined ? null : `vscode://file/${metascope.options.path}`,
		'Readme Path': toLocalUrl(codemeta.readme, metascope?.options.path) ?? null,

		// ── Links ─────────────────────────────────────────────
		'Homepage URL':
			codemeta.url !== undefined && !codemeta.url.startsWith('https://github.com/')
				? codemeta.url
				: null,
		'Repo URL': codemeta.codeRepository ?? github?.url ?? null,
		'Issues URL': codemeta.issueTracker ?? null,
		'Readme URL':
			codemeta.readme !== undefined && isValidUrl(codemeta.readme) ? codemeta.readme : null,
		'Package URL':
			obsidianPluginRegistry?.url ?? nodeNpmRegistry?.url ?? pythonPypiRegistry?.url ?? null,

		// ── Timeline ──────────────────────────────────────────
		Created: codemeta.dateCreated ?? null,
		'First Commit Date': gitStats?.commitDateFirst ?? null,
		'Latest Commit Date': gitStats?.commitDateLast ?? null,
		'Latest Push Date': github?.pushedAt ?? null,
		// 'Last Updated': github.updatedAt,
		'Latest Release Date':
			github?.releaseDateLatest ??
			nodeNpmRegistry?.publishDateLatest ??
			pythonPypiRegistry?.publishDateLatest ??
			gitStats?.tagVersionDateLatest ??
			null,
		'Latest Release Version':
			obsidianPluginManifestJson?.version ??
			nodeNpmRegistry?.versionLatest ??
			pythonPypiRegistry?.versionLatest ??
			github?.releaseVersionLatest ??
			gitStats?.tagVersionLatest ??
			null,

		// ── Popularity ────────────────────────────────────────
		Stars: github?.stargazerCount ?? null,
		Watchers: github?.watcherCount ?? null,
		Contributors: github?.contributorCount ?? gitStats?.contributorCount ?? null,
		Forks: github?.forkCount ?? null,
		'Downloads Total':
			obsidianPluginRegistry?.downloadCount ??
			nodeNpmRegistry?.downloadsTotal ??
			pythonPypiRegistry?.downloads180Days ??
			github?.releaseDownloadCount ??
			null,
		'Downloads Monthly':
			nodeNpmRegistry?.downloadsMonthly ?? pythonPypiRegistry?.downloadsMonthly ?? null,

		// ── Activity ──────────────────────────────────────────

		Releases: github?.releaseCount ?? gitStats?.tagReleaseCount ?? null,
		'Issues Open': github?.issueCountOpen ?? null,
		'Issues Closed': github?.issueCountClosed ?? null,
		'PRs Open': github?.pullRequestCountOpen ?? null,
		'PRs Merged': github?.pullRequestCountMerged ?? null,
		'PRs Closed': github?.pullRequestCountClosed ?? null,
		'Vulnerability Alerts': github?.vulnerabilityAlertCount ?? null,

		// ── Codebase ──────────────────────────────────────────
		'Lines of Code': codeStats?.total?.code ?? null,
		'Total Files': fileStats?.totalFileCount ?? null,
		// 'Total Directories': fileStats?.totalDirectoryCount ?? null,
		'Total Size MB': toMb(fileStats?.totalSizeBytes) ?? null,
		'Tracked Files': gitStats?.trackedFileCount ?? null,
		'Tracked Size MB': toMb(gitStats?.trackedSizeBytes) ?? null,
		'GitHub Size MB': toMb(github?.diskUsageBytes) ?? null,

		// ── Dependencies ──────────────────────────────────────────
		Dependencies: dependencyNames(codemeta, 'prod') ?? null,
		'Dev Dependencies': dependencyNames(codemeta, 'dev') ?? null,
		'Major Updates': dependencyUpdates?.data.major?.length ?? 0,
		'Minor Updates': dependencyUpdates?.data.minor?.length ?? 0,
		'Patch Updates': dependencyUpdates?.data.patch?.length ?? 0,
		'Total Updates': dependencyUpdates?.extra?.total ?? 0,
		Libyears: dependencyUpdates?.extra?.libyears ?? 0,
		// 'Shared Config': hasDependencyWithId('@kitschpatrol/shared-config', codemeta),
		// Svelte: hasDependencyWithId('svelte', codemeta),
		// Electron: hasDependencyWithId('electron', codemeta),
		Runtime: codemeta.runtimePlatform ?? null,
		'Operating System': codemeta.operatingSystem ?? null,

		// ── Project Health ────────────────────────────────────
		// 'Has Contributing': github.hasContributing,
		// 'Has Security Policy': github.isSecurityPolicyEnabled,
		// 'Code of Conduct': github.codeOfConduct,
		// 'Has Sponsorships': github.hasSponsorshipsEnabled,
		// 'Funding Links': github.fundingLinks?.map((l) => `${l.platform}: ${l.url}`),

		// ── Flags ─────────────────────────────────────────────
		// Fork: github?.isFork ?? false,
		'Forked From': github?.forkedFrom ?? null,
		'Fork Ahead': github?.commitsAheadUpstream ?? null,
		'Fork Behind': github?.commitsBehindUpstream ?? null,
		// Mirror: github?.isMirror ?? false,
		// 'Mirrored From': github?.mirrorUrl ?? null,
		// "Archived Date": github?.archivedAt ?? null,
		// Archived: github.isArchived ?? false,
		'Template From': github?.templateFrom ?? null,
		// 'Template Repo': github?.isTemplate ?? false,
		Organization: github?.isInOrganization ?? false,
		// 'Has Wiki': github.hasWikiEnabled,
		// 'Has Pages': github.hasPages,
		// 'Has Discussions': github.hasDiscussionsEnabled,
		// 'Issues': github.hasIssuesEnabled,

		// ── Git Status ────────────────────────────────────────
		// 'Git Clean': gitStats?.isClean ?? null,
		'Git Commits': gitStats?.commitCount ?? null,
		'Git Dirty Files': gitStats?.uncommittedFileCount ?? null,
		'Git Remotes Ahead': gitStats?.totalAhead ?? null,
		'Git Remotes Behind': gitStats?.totalBehind ?? null,
		'Git LFS': gitStats?.hasLfs ?? github?.hasLfs ?? false,
		'Git Tags': gitStats?.tagCount ?? null,
		'Git Current Branch': gitStats?.branchCurrent ?? null,
		'Git Branches': gitStats?.branchCount ?? null,
		'Git Remotes': gitStats?.remoteCount ?? null,
		'Git Submodules': gitStats?.submoduleCount ?? 0,

		// ── Settings ──────────────────────────────────────────
		// 'Allow Auto Merge': github.settings?.autoMergeAllowed,
		// 'Allow Forking': github.settings?.forkingAllowed,
		// 'Delete Branch on Merge': github.settings?.deleteBranchOnMerge,
		// 'Squash Merge Allowed': github.settings?.squashMergeAllowed,
		// 'Rebase Merge Allowed': github.settings?.rebaseMergeAllowed,
		// 'Merge Commit Allowed': github.settings?.mergeCommitAllowed,

		// ── Meta ──────────────────────────────────────────────
		'Metadata Scanned': metascope?.scannedAt ?? null,

		/* eslint-enable perfectionist/sort-objects */
	}
})
