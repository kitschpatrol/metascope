import { defineTemplate } from '../types'
import {
	basicLicense,
	basicNames,
	stripNamespace,
	toDelimitedString,
	toLocalUrl,
	usesSharedConfig,
} from '../utilities'

/**
 * A compact, non-nested, polyglot overview of the project.
 */
export const summary = defineTemplate(
	({ codemeta, github, loc, metascope, npm, obsidian, pypi }) => ({
		alias: stripNamespace(codemeta.name),
		author: toDelimitedString(basicNames(codemeta.author)),
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
		tags: codemeta.keywords,
		version: codemeta.version,
	}),
)
