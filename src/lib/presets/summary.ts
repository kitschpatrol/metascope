import { defineTemplate } from '../types'

export const summary = defineTemplate(({ codemeta, github, npm }) => ({
	author: codemeta.author,
	description: codemeta.description,
	downloads: npm.weeklyDownloads,
	forks: github.forkCount,
	issues: github.openIssueCount,
	license: codemeta.license,
	name: codemeta.name,
	stars: github.stargazerCount,
	version: codemeta.version,
}))
