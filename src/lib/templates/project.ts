import { defineTemplate } from '../metadata-types'
import {
	getStatus,
	isAuthoredBy,
	isOnGithubAccountOf,
	toBasicLicenses,
	toLocalUrl,
	usesPnpm,
	usesSharedConfig,
} from '../utilities'

/**
 * Legacy structure used in AllWork desktop app
 */
export const project = defineTemplate(
	(
		{
			codemetaJson: codemeta,
			dependencyUpdates,
			git,
			github,
			metascope,
			nodeNpmRegistry: npm,
			nodePackageJson: packageJson,
		},
		{ authorName, githubAccount },
	) => ({
		description: codemeta.description,
		firstCommitDate: git.commitDateFirst,
		gitHubLink: github.url,
		gitHubStarCount: github.stargazerCount,
		gitIsClean: git.isClean,
		gitIsDirty: git.isDirty,
		gitRemoteCount: git.remoteCount,
		homepage: github.homepageUrl ?? codemeta.url ?? github.url,
		isAuthoredByMe: isAuthoredBy(codemeta, authorName),
		isOnMyGitHub: isOnGithubAccountOf(codemeta, githubAccount),
		isOnNpm: npm.url !== undefined,
		isPublic: !(github.isPrivate ?? false),
		isRemoteAhead: git.isRemoteAhead,
		issueCount: github.issueCountOpen,
		lastCommitDate: git.commitDateLast,
		license: toBasicLicenses(codemeta.license ?? github.licenseSpdxId)?.at(0),
		majorUpdateCount: dependencyUpdates.major?.length ?? 0,
		majorUpdateList: dependencyUpdates.major?.map((value) => value.name),
		npmDownloadCount: npm.downloadsTotal,
		readmePath: toLocalUrl(codemeta.readme, metascope.path),
		repositoryPath: metascope.path === undefined ? undefined : `file://${metascope.path}`,
		semverUpdateCount: undefined, // TODO, Not well supported by `updates` package
		semverUpdateList: undefined, // TODO, Not well supported by `updates` package
		tags: codemeta.keywords,
		title: codemeta.name,
		type: getStatus(codemeta, authorName, githubAccount),
		usesPnpm: usesPnpm(packageJson),
		usesSharedConfig: usesSharedConfig(codemeta),
		version: codemeta.version,
	}),
)
