/* eslint-disable complexity */

import { defineTemplate } from '../metadata-types'
import { firstOf, toLocalUrl } from '../utilities/formatting'
import {
	getStatus,
	isAuthoredBy,
	isOnGithubAccountOf,
	toBasicLicenses,
	usesPnpm,
	usesSharedConfig,
} from '../utilities/template-helpers'

/**
 * Legacy structure used in AllWork desktop app
 */
export const project = defineTemplate(
	(
		{
			codemetaJson: codemetaRaw,
			dependencyUpdates: dependencyUpdatesRaw,
			github: githubRaw,
			gitStatistics: gitRaw,
			metascope,
			nodeNpmRegistry: npmRaw,
			nodePackageJson: packageJson,
		},
		{ authorName, githubAccount },
	) => {
		const codemeta = firstOf(codemetaRaw)
		const dependencyUpdates = firstOf(dependencyUpdatesRaw)
		const git = firstOf(gitRaw)
		const github = firstOf(githubRaw)
		const npm = firstOf(npmRaw)
		return {
			description: codemeta?.data.description,
			firstCommitDate: git?.data.commitDateFirst,
			gitHubLink: github?.data.url,
			gitHubStarCount: github?.data.stargazerCount,
			gitIsClean: git?.data.isClean,
			gitIsDirty: git?.data.isDirty,
			gitRemoteCount: git?.data.remoteCount,
			homepage: github?.data.homepageUrl ?? codemeta?.data.url ?? github?.data.url,
			isAuthoredByMe: isAuthoredBy(codemeta, authorName),
			isOnMyGitHub: isOnGithubAccountOf(codemeta, githubAccount),
			isOnNpm: npm?.data.url !== undefined,
			isPublic: !(github?.data.isPrivate ?? false),
			isRemoteAhead: git?.data.isRemoteAhead,
			issueCount: github?.data.issueCountOpen,
			lastCommitDate: git?.data.commitDateLast,
			license: toBasicLicenses(codemeta?.data.license ?? github?.data.licenseSpdxId)?.at(0),
			majorUpdateCount: dependencyUpdates?.data.major?.length ?? 0,
			majorUpdateList: dependencyUpdates?.data.major?.map((value) => value.name),
			npmDownloadCount: npm?.data.downloadsTotal,
			readmePath: toLocalUrl(codemeta?.data.readme, metascope?.data.options.path),
			repositoryPath:
				metascope?.data.options.path === undefined
					? undefined
					: `file://${metascope.data.options.path}`,
			semverUpdateCount: undefined, // TODO, Not well supported by `updates` package
			semverUpdateList: undefined, // TODO, Not well supported by `updates` package
			tags: codemeta?.data.keywords,
			title: codemeta?.data.name,
			type: getStatus(codemeta, authorName, githubAccount),
			usesPnpm: usesPnpm(packageJson),
			usesSharedConfig: usesSharedConfig(codemeta),
			version: codemeta?.data.version,
		}
	},
)
