/* eslint-disable ts/naming-convention */

import { meta } from 'zod/mini'
import { defineTemplate } from '../types'
import {
	basicLicense,
	basicNames,
	getStatus,
	stripNamespace,
	toDelimitedString,
	toLocalUrl,
	usesPnpm,
	usesSharedConfig,
} from '../utilities'

/**
 * A compact, non-nested, polyglot overview of the project.
 * Used to populate Obsidian frontmatter.
 *
 *
 *
 */
export const flat = defineTemplate(
	(
		{ codemeta, git, github, loc, metascope, npm, obsidian, packageJson, pypi },
		{ authorName, githubAccount },
	) => ({
		/* eslint-disable perfectionist/sort-objects */

		// Basics
		Name: codemeta.name,
		Description: codemeta.description,
		Authors: basicNames(codemeta.author),
		Version: codemeta.version ?? '',
		'First Commit': git.commitDateFirst ?? '',
		'Latest Commit': git.commitDateLast ?? '',
		Status: getStatus(codemeta, authorName, githubAccount),
		License: basicLicense(codemeta.license) ?? '',
		Public: !(github.isPrivate ?? false),

		// Links
		Homepage: github.homepage ?? codemeta.url ?? '',
		'Package Registry': obsidian.url ?? npm.url ?? pypi.url ?? '',
		'Local Repository': metascope.path === undefined ? undefined : `file://${metascope.path}`,
		'GitHub Repository': github.repoUrl,
		Readme: toLocalUrl(codemeta.readme, metascope.path),

		// Obsidian
		alias: stripNamespace(codemeta.name),
		tags: codemeta.keywords ?? [],

		// Popularity
		Stars: github.stargazerCount ?? '',
		Watchers: github.watcherCount ?? '',
		Forks: github.forkCount ?? '',
		Downloads:
			obsidian.downloadCount ??
			npm.downloadsTotal ??
			pypi.downloads180Days ??
			github.releaseDownloadCount ??
			'',
		'Issues Open': github.issueCountOpen,
		'Issues Closed': github.issueCountOpen,
		'Pull Requests Open': github.pullRequestCountOpen,
		'Pull Requests Merged': github.pullRequestCountMerged,
		'Pull Requests Closed': github.pullRequestCountClosed,

		// Infrastructure
		'Uses PNPM': usesPnpm(packageJson),
		'Uses Shared Config': usesSharedConfig(codemeta),

		// Development Status
		'Git is Clean': git.isClean,
		'Git Remotes': git.remoteCount,
		'Git Remote Ahead': git.isRemoteAhead,

		// Metadata metadata

		'Last Scanned': metascope.scannedAt,

		/* More */
		commitsBehind: github.commitsBehindUpstream,
		description: codemeta.description,
		downloads:
			obsidian.downloadCount ??
			npm.downloadsTotal ??
			pypi.downloads180Days ??
			github.releaseDownloadCount,
		forks: github.forkCount,
		homepageUrl: github.homepage ?? codemeta.url ?? github.repoUrl,
		isFork: github.isFork,
		issuesClosed: github.issueCountClosed,
		issuesOpen: github.issueCountOpen,
		language: toDelimitedString(codemeta.programmingLanguage),
		license: basicLicense(codemeta.license),
		linesOfCode: loc.total?.code,
		localUrl: metascope.path === undefined ? undefined : `file://${metascope.path}`,
		name: codemeta.name,
		packageUrl: npm.url ?? pypi.url ?? obsidian.url,
		public: !(github.isPrivate ?? false),
		readmeFileUrl: toLocalUrl(codemeta.readme, metascope.path),
		readmeWebUrl: codemeta.readme,
		releases: github.releaseCount,
		repoUrl: github.repoUrl,
		runtime: toDelimitedString(codemeta.runtimePlatform),
		scanned: metascope.scannedAt,
		sharedConfig: usesSharedConfig(codemeta),
		stars: github.stargazerCount,
		version: codemeta.version,

		/* eslint-enable perfectionist/sort-objects */
	}),
)
