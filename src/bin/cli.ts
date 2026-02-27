#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { bin, version } from '../../package.json'
import { createLogger, getChildLogger } from 'lognow'
import { getMetadata, setLogger, templates } from '../lib'
import type { Template } from '../lib'
import { setLogger as setLoggerReadPyproject } from 'read-pyproject'
import { setLogger as setLoggerCodeMeta } from '@kitschpatrol/codemeta'

const cliCommandName = Object.keys(bin).at(0)!
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
					description:
						'Built-in template name (e.g., "summary") or path to a template file (.ts/.js)',
					type: 'string',
				})
				.option('github-token', {
					description: 'GitHub API token (or set $GITHUB_TOKEN)',
					type: 'string',
				})
				.option('verbose', {
					description: 'Run with verbose logging',
					type: 'boolean',
					default: false,
				}),
		async (argv) => {
			const log = createLogger({
				verbose: argv.verbose ?? false,
				logToConsole: { showTime: false },
			})
			setLogger(log)
			setLoggerReadPyproject(getChildLogger(log, 'read-pyproject'))
			setLoggerCodeMeta(getChildLogger(log, 'codemeta'))

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
						const templateModule = (await jiti.import(argv.template)) as {
							default?: Template<unknown>
						}
						template = templateModule.default
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
				const result = template
					? await getMetadata({ credentials, path: argv.path, template })
					: await getMetadata({ credentials, path: argv.path })

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
