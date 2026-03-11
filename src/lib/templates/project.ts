/* eslint-disable complexity */

import { defineTemplate } from '../metadata-types'
import { codeMetaJsonDataSchema } from '../sources/codemeta-json'
import {
	firstOf,
	isAuthoredBy,
	isOnGithubAccountOf,
	toBasicLicenses,
	toLocalUrl,
	toStatus,
	usesPnpm,
	usesSharedConfig,
} from '../utilities/template-helpers'
import { codemeta as codemetaTemplate } from './codemeta'

export type TemplateDataProject = ReturnType<typeof project>

/**
 * Legacy structure used in AllWork desktop app
 */
export const project = defineTemplate((context, templateData) => {
	// Let the codemeta template do the heavy aggregation...
	const codemetaTemplateOutput = codemetaTemplate(context, templateData)
	const codemeta = codeMetaJsonDataSchema.parse(codemetaTemplateOutput)

	const dependencyUpdates = firstOf(context.dependencyUpdates)
	const github = firstOf(context.github)?.data
	const gitStats = firstOf(context.gitStats)?.data
	const metascope = context.metascope?.data
	const nodeNpmRegistry = firstOf(context.nodeNpmRegistry)?.data
	const nodePackageJson = firstOf(context.nodePackageJson)

	return {
		description: codemeta.description,
		firstCommitDate: gitStats?.commitDateFirst,
		gitHubLink: github?.url,
		gitHubStarCount: github?.stargazerCount,
		gitIsClean: gitStats?.isClean,
		gitIsDirty: gitStats?.isDirty,
		gitRemoteCount: gitStats?.remoteCount,
		homepage: github?.homepageUrl ?? codemeta.url ?? github?.url,
		isAuthoredByMe: isAuthoredBy(codemeta.author, templateData.authorName),
		isOnMyGitHub: isOnGithubAccountOf(codemeta.codeRepository, templateData.githubAccount),
		isOnNpm: nodeNpmRegistry?.url !== undefined,
		isPublic: !(github?.isPrivate ?? false),
		isRemoteAhead: gitStats?.isRemoteAhead,
		issueCount: github?.issueCountOpen,
		lastCommitDate: gitStats?.commitDateLast,
		license: toBasicLicenses(codemeta.license ?? github?.licenseSpdxId)?.at(0),
		majorUpdateCount: dependencyUpdates?.data.major?.length ?? 0,
		majorUpdateList: dependencyUpdates?.data.major?.map((value) => value.name),
		npmDownloadCount: nodeNpmRegistry?.downloadsTotal,
		readmePath: toLocalUrl(codemeta.readme, metascope?.options.path),
		repositoryPath:
			metascope?.options.path === undefined ? undefined : `file://${metascope.options.path}`,
		semverUpdateCount: undefined, // TODO, Not well supported by `updates` package
		semverUpdateList: undefined, // TODO, Not well supported by `updates` package
		tags: codemeta.keywords,
		title: codemeta.name,
		type: toStatus(
			codemeta.codeRepository,
			codemeta.author,
			templateData.authorName,
			templateData.githubAccount,
		),
		usesPnpm: usesPnpm(nodePackageJson),
		usesSharedConfig: usesSharedConfig(codemeta),
		version: codemeta.version,
	}
})
