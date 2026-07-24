#!/usr/bin/env node

import { createLogger, getChildLogger } from 'lognow'
import { setLogger as setLoggerReadPyproject } from 'read-pyproject'
import { kebabCase } from 'string-ts'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import type { SourceName, Template, TemplateData } from '../lib'
import { bin, name, version } from '../../package.json' with { type: 'json' }
import {
	DEFAULT_GET_METADATA_OPTIONS,
	getMetadata,
	setLogger,
	sourceNames,
	templates,
} from '../lib'
import { isKeyOfTemplate } from '../lib/templates'

const cliCommandName = Object.keys(bin).at(0)!
const builtInTemplateNames = Object.keys(templates)
const yargsInstance = yargs(hideBin(process.argv))

// Source names are camelCase internally (the programmatic API), but the CLI
// accepts the more idiomatic kebab-case form. Both are accepted silently; the
// help text only shows the kebab-case form.
const kebabToCamelSource = new Map<string, SourceName>(
	sourceNames.map((sourceName) => [kebabCase(sourceName), sourceName]),
)
const kebabSourceNames = kebabToCamelSource.keys().toArray()

function resolveSourceArgument(argument: string): SourceName | undefined {
	if (sourceNames.includes(argument as SourceName)) {
		return argument as SourceName
	}

	return kebabToCamelSource.get(argument)
}

await yargsInstance
	.scriptName(cliCommandName)
	.command(
		'$0 [path]',
		'Extract metadata from a code repository.',
		(builder) =>
			builder
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
					array: true,
					description: 'Optional author name(s) for ownership checks in templates',
					type: 'string',
				})
				.option('github-account', {
					array: true,
					description: 'Optional GitHub account name(s) for ownership checks in templates',
					type: 'string',
				})
				.option('absolute', {
					default: DEFAULT_GET_METADATA_OPTIONS.absolute,
					description: 'Output absolute paths. Use `--no-absolute` for relative paths.',
					type: 'boolean',
				})
				.option('offline', {
					default: DEFAULT_GET_METADATA_OPTIONS.offline,
					description: 'Skip sources requiring network requests',
					type: 'boolean',
				})
				.option('sources', {
					alias: 's',
					array: true,
					coerce: (values: string[]) => values.map((v) => resolveSourceArgument(v) ?? v),
					description: `Only run specific metadata sources (${kebabSourceNames.map((n) => `\`${n}\``).join(', ')}); defaults to all`,
					type: 'string',
				})
				.check((argv) => {
					const invalid = argv.sources?.filter((s) => !sourceNames.includes(s as SourceName))
					if (invalid && invalid.length > 0) {
						throw new Error(
							`Invalid source(s): ${invalid.join(', ')}. Valid sources: ${kebabSourceNames.join(', ')}`,
						)
					}

					return true
				})
				.option('no-ignore', {
					default: !DEFAULT_GET_METADATA_OPTIONS.respectIgnored,
					description: 'Include files ignored by .gitignore in the file tree',
					type: 'boolean',
				})
				.option('recursive', {
					alias: 'r',
					default: DEFAULT_GET_METADATA_OPTIONS.recursive,
					description: 'Search for metadata files recursively in subdirectories',
					type: 'boolean',
				})
				.option('workspaces', {
					alias: 'w',
					coerce(value: Array<boolean | string> | boolean | string) {
						if (value === true || value === false) {
							return value
						}

						const values = Array.isArray(value) ? value : [value]
						const strings = values.filter((v): v is string => typeof v === 'string')
						return strings.length > 0 ? strings : true
					},
					default: DEFAULT_GET_METADATA_OPTIONS.workspaces,
					description:
						'Include workspace-specific metadata in monorepos; pass a `boolean` to enable or disable auto-detection, or pass one or more `string`s to explicitly define workspace paths',
				})
				.option('verbose', {
					default: false,
					description: 'Run with verbose logging',
					type: 'boolean',
				}),
		async (argv) => {
			const log = createLogger({
				logToConsole: { showTime: false },
				name,
				verbose: argv.verbose,
			})
			setLogger(log)
			setLoggerReadPyproject(getChildLogger(log, 'read-pyproject'))
			log.debug('Starting metadata extraction...')

			// Resolve template: try built-in template first, then load as file
			let template: Template<unknown> | undefined
			if (argv.template !== undefined && argv.template !== '') {
				if (isKeyOfTemplate(argv.template)) {
					// Built in
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
							const templateFunction = templateModule.default as Template<unknown>
							template = (context, data) => templateFunction(context, data)
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
				const credentials =
					argv.githubToken !== undefined && argv.githubToken !== ''
						? { githubToken: argv.githubToken }
						: undefined
				const templateData: TemplateData = {
					...(argv.authorName && { authorName: argv.authorName }),
					...(argv.githubAccount && { githubAccount: argv.githubAccount }),
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
