#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { bin, version } from '../../package.json'
import { createLogger, getChildLogger } from 'lognow'
import { getMetadata, setLogger, templates } from '../lib'
import type { Template, TemplateData } from '../lib'
import { setLogger as setLoggerReadPyproject } from 'read-pyproject'

const cliCommandName = Object.keys(bin).at(0)!
const builtInTemplateNames = Object.keys(templates)
const yargsInstance = yargs(hideBin(process.argv))

await yargsInstance
	.scriptName(cliCommandName)
	.command(
		'$0 [path]',
		'Extract metadata from a code repository.',
		(yargs) =>
			yargs
				.positional('path', {
					default: '.',
					description: 'Project directory path',
					type: 'string',
				})
				.option('template', {
					alias: 't',
					description: `Built-in template name (${builtInTemplateNames.map((n) => `"${n}"`).join(', ')}) or path to a template file (.ts/.js)`,
					type: 'string',
				})
				.option('github-token', {
					description: 'GitHub API token (or set $GITHUB_TOKEN)',
					type: 'string',
				})
				.option('author-name', {
					description: 'Optional author name(s) for ownership checks in templates',
					type: 'string',
					array: true,
				})
				.option('github-account', {
					description: 'Optional GitHub account name(s) for ownership checks in templates',
					type: 'string',
					array: true,
				})
				.option('offline', {
					description:
						'Skip network requests (web-based sources will return only locally-available data)',
					type: 'boolean',
				})
				.option('no-ignore', {
					description: 'Include files ignored by .gitignore in the file tree',
					type: 'boolean',
				})
				.option('recursive', {
					alias: 'r',
					description: 'Search for metadata files recursively in subdirectories',
					type: 'boolean',
				})
				.option('verbose', {
					description: 'Run with verbose logging',
					type: 'boolean',
				}),
		async (argv) => {
			const log = createLogger({
				verbose: argv.verbose ?? false,
				logToConsole: { showTime: false },
			})
			setLogger(log)
			setLoggerReadPyproject(getChildLogger(log, 'read-pyproject'))
			log.debug('Starting metadata extraction...')

			// Resolve template: try built-in template first, then load as file
			let template: Template<unknown> | undefined
			if (argv.template) {
				const builtIn = templates[argv.template]
				if (builtIn) {
					template = builtIn
				} else {
					try {
						const { createJiti } = await import('jiti')
						const jiti = createJiti(import.meta.url)
						const templateModule: unknown = await jiti.import(argv.template)
						if (
							typeof templateModule === 'object' &&
							templateModule !== null &&
							'default' in templateModule &&
							typeof templateModule.default === 'function'
						) {
							// Runtime-validated function from dynamic import; shape guaranteed by defineTemplate()
							const fn = templateModule.default
							template = (context, data) => fn(context, data)
						}
						if (typeof template !== 'function') {
							log.error(
								'Template file must export a function as default export. Use defineTemplate().',
							)
							process.exitCode = 1
							return
						}
					} catch (error) {
						log.error(
							`Failed to load template: ${error instanceof Error ? error.message : String(error)}`,
						)
						process.exitCode = 1
						return
					}
				}
			}

			try {
				const credentials = argv.githubToken ? { githubToken: argv.githubToken } : undefined
				const templateData: TemplateData = {
					...(argv.authorName ? { authorName: argv.authorName } : {}),
					...(argv.githubAccount ? { githubAccount: argv.githubAccount } : {}),
				}
				const noIgnore = argv.noIgnore ?? false
				const offline = argv.offline ?? false
				const recursive = argv.recursive ?? false
				const result = template
					? await getMetadata({
							credentials,
							noIgnore,
							offline,
							path: argv.path,
							recursive,
							template,
							templateData,
						})
					: await getMetadata({ credentials, noIgnore, offline, path: argv.path, recursive, templateData })

				// JSON output: pretty when TTY, compact when piped
				const json = process.stdout.isTTY
					? JSON.stringify(result, undefined, 2)
					: JSON.stringify(result)

				process.stdout.write(json + '\n')
			} catch (error) {
				log.error(
					`Metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`,
				)
				process.exitCode = 1
			}
		},
	)
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	.help()
	.strict()
	.wrap(process.stdout.isTTY ? Math.min(120, yargsInstance.terminalWidth()) : 0)
	.parse()
