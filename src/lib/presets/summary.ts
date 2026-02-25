import { defineTemplate } from '../types'

export const summary = defineTemplate(({ codemeta, github, npm }) => ({
	author: codemeta.author,
	description: codemeta.description,
	downloads: npm.downloadsWeekly,
	forks: github.forkCount,
	issues: github.issueCountOpen,
	license: codemeta.license,
	name: codemeta.name,
	stars: github.stargazerCount,
	version: codemeta.version,
}))
