import { defineTemplate } from '../metadata-types'
import {
	basicLicense,
	getStatus,
	isAuthoredBy,
	isOnGithubAccountOf,
	toLocalUrl,
	usesPnpm,
	usesSharedConfig,
} from '../utilities'

/**
 * Legacy structure used in AllWork desktop app
 */
export const project = defineTemplate(
	(
		{ codemeta, git, github, metascope, npm, packageJson, updates },
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
		license: basicLicense(codemeta.license),
		majorUpdateCount: updates.major?.length ?? 0,
		majorUpdateList: updates.major?.map((value) => value.name),
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
