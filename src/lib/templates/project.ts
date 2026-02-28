import { defineTemplate } from '../types'
import {
	basicLicense,
	getStatus,
	isAuthoredBy,
	toLocalUrl,
	usesPnpm,
	usesSharedConfig,
} from '../utilities'

/**
 * Legacy structure used in AllWork desktop app
 */
export const project = defineTemplate(
	({ codemeta, git, github, metascope, npm, packageJson, updates }) => ({
		description: codemeta.description,
		firstCommitDate: git.commitDateFirst,
		gitHubLink: github.repoUrl,
		gitHubStarCount: github.stargazerCount,
		gitIsClean: git.isClean,
		gitIsDirty: git.isDirty,
		gitRemoteCount: git.remoteCount,
		homepage: github.homepage ?? codemeta.url ?? github.repoUrl,
		isAuthoredByMe: isAuthoredBy(codemeta, ['Eric Mika']),
		isOnMyGitHub: packageJson.repository?.url.toLowerCase().includes('kitschpatrol') ?? false,
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
		semverUpdateCount: undefined, // TODO
		semverUpdateList: undefined, // TODO
		tags: codemeta.keywords,
		title: codemeta.name,
		type: getStatus(codemeta, ['Eric Mika'], ['kitschpatrol']),
		usesPnpm: usesPnpm(packageJson),
		usesSharedConfig: usesSharedConfig(codemeta),
		version: codemeta.version,
	}),
)
