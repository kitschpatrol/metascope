#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { bin, version, name } from '../../package.json'
import { createLogger, getChildLogger } from 'lognow'
import {
	DEFAULT_GET_METADATA_OPTIONS,
	getMetadata,
	setLogger,
	sourceNames,
	templates,
} from '../lib'
import type { SourceName, Template, TemplateData } from '../lib'
import { setLogger as setLoggerReadPyproject } from 'read-pyproject'
import { isKeyOfTemplate } from '../lib/templates'

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
					default: DEFAULT_GET_METADATA_OPTIONS.path,
					description: 'Project directory path',
					type: 'string',
				})
				.option('template', {
					alias: 't',
					description: `Built-in template name (${builtInTemplateNames.map((n) => `\`${n}\``).join(', ')}) or path to a custom template file`,
					type: 'string',
				})
				.option('github-token', {
					description: 'GitHub API token (or set `$GITHUB_TOKEN`)',
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
				.option('absolute', {
					description: 'Output absolute paths. Use `--no-absolute` for relative paths.',
					type: 'boolean',
					default: DEFAULT_GET_METADATA_OPTIONS.absolute,
				})
				.option('offline', {
					description: 'Skip sources requiring network requests',
					type: 'boolean',
					default: DEFAULT_GET_METADATA_OPTIONS.offline,
				})
				.option('sources', {
					alias: 's',
					array: true,
					choices: sourceNames,
					description: 'Only run specific metadata sources (defaults to all)',
					type: 'string',
				})
				.option('no-ignore', {
					description: 'Include files ignored by .gitignore in the file tree',
					type: 'boolean',
					default: !DEFAULT_GET_METADATA_OPTIONS.respectIgnored,
				})
				.option('recursive', {
					alias: 'r',
					description: 'Search for metadata files recursively in subdirectories',
					type: 'boolean',
					default: DEFAULT_GET_METADATA_OPTIONS.recursive,
				})
				.option('workspaces', {
					alias: 'w',
					coerce: (value: (boolean | string)[] | boolean | string) => {
						if (value === true || value === false) return value
						const values = Array.isArray(value) ? value : [value]
						const strings = values.filter((v): v is string => typeof v === 'string')
						return strings.length > 0 ? strings : true
					},
					default: DEFAULT_GET_METADATA_OPTIONS.workspaces,
					description:
						'Include workspace-specific metadata in monorepos; pass a `boolean` to enable or disable auto-detection, or pass one or more `string`s to explicitly define workspace paths',
				})
				.option('verbose', {
					description: 'Run with verbose logging',
					type: 'boolean',
					default: false,
				}),
		async (argv) => {
			const log = createLogger({
				name: name,
				verbose: argv.verbose ?? false,
				logToConsole: { showTime: false },
			})
			setLogger(log)
			setLoggerReadPyproject(getChildLogger(log, 'read-pyproject'))
			log.debug('Starting metadata extraction...')

			// Resolve template: try built-in template first, then load as file
			let template: Template<unknown> | undefined
			if (argv.template) {
				if (isKeyOfTemplate(argv.template)) {
					// built in
					template = templates[argv.template]
				} else {
					// Load file
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
				const sharedOptions = {
					absolute: argv.absolute,
					credentials,
					offline: argv.offline,
					path: argv.path,
					recursive: argv.recursive,
					respectIgnored: argv.noIgnore ? false : undefined,
					sources: argv.sources as SourceName[] | undefined,
					templateData,
					workspaces: argv.workspaces as boolean | string[] | undefined,
				}
				const result = template
					? await getMetadata({ ...sharedOptions, template })
					: await getMetadata(sharedOptions)

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
