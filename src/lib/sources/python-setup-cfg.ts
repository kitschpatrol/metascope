/* eslint-disable ts/naming-convention */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { OneOrMany, SourceRecord } from '../source.js'
import { getMatches } from '../file-matching.js'
import { parseConfigparser, splitMultiline } from '../parsers/configparser-parser.js'
import { defineSource } from '../source.js'
import { nonEmptyString, optionalUrl, stringArray } from '../utilities/schema-primitives.js'

// ─── Types ───────────────────────────────────────────────────────────────────

const setupCfgDataSchema = z.object({
	author: nonEmptyString,
	author_email: nonEmptyString,
	classifiers: stringArray,
	description: nonEmptyString,
	download_url: optionalUrl,
	extras_require: z.record(z.string(), z.array(z.string())),
	install_requires: stringArray,
	keywords: z.array(z.string()).optional(),
	license: nonEmptyString,
	long_description: nonEmptyString,
	maintainer: nonEmptyString,
	maintainer_email: nonEmptyString,
	name: nonEmptyString,
	project_urls: z.record(z.string(), z.string()),
	python_requires: nonEmptyString,
	url: optionalUrl,
	version: nonEmptyString,
})

/** Parsed setup.cfg metadata */
export type SetupCfg = z.infer<typeof setupCfgDataSchema>

export type PythonSetupCfgData = OneOrMany<SourceRecord<SetupCfg>> | undefined

// ─── Parser ──────────────────────────────────────────────────────────────────

/** Simple string attributes to extract from [metadata]. */
const STRING_ATTRS = new Set<keyof SetupCfg>([
	'author',
	'author_email',
	'description',
	'download_url',
	'license',
	'long_description',
	'maintainer',
	'maintainer_email',
	'name',
	'url',
	'version',
])

/**
 * Parse a setup.cfg file and return structured metadata.
 *
 * Extracts fields from the `[metadata]` and `[options]` sections,
 * including multi-line values like classifiers and install_requires.
 */
export function parse(source: string): SetupCfg {
	const sections: Partial<Record<string, Record<string, string>>> = parseConfigparser(source)
	const metadata = sections.metadata ?? {}
	const options = sections.options ?? {}

	const data: SetupCfg = {
		author: undefined,
		author_email: undefined,
		classifiers: [],
		description: undefined,
		download_url: undefined,
		extras_require: {},
		install_requires: [],
		keywords: undefined,
		license: undefined,
		long_description: undefined,
		maintainer: undefined,
		maintainer_email: undefined,
		name: undefined,
		project_urls: {},
		python_requires: undefined,
		url: undefined,
		version: undefined,
	}

	// String attributes from [metadata]
	for (const key of STRING_ATTRS) {
		const value = metadata[key]
		if (value) {
			Object.assign(data, { [key]: value })
		}
	}

	// Classifiers — multi-line list in [metadata]
	if (metadata.classifiers) {
		data.classifiers = splitMultiline(metadata.classifiers)
	}

	// Keywords — comma-separated on a single line
	if (metadata.keywords) {
		data.keywords = metadata.keywords
			.split(',')
			.map((k) => k.trim())
			.filter(Boolean)
	}

	// Project URLs — multi-line "label = url" pairs in [metadata]
	if (metadata.project_urls) {
		for (const line of splitMultiline(metadata.project_urls)) {
			const eqIndex = line.indexOf('=')
			if (eqIndex > 0) {
				const label = line.slice(0, eqIndex).trim()
				const url = line.slice(eqIndex + 1).trim()
				if (url) {
					data.project_urls[label] = url
				}
			}
		}
	}

	// Install_requires — multi-line dependency list in [options]
	if (options.install_requires) {
		data.install_requires = splitMultiline(options.install_requires)
	}

	// Python_requires — version constraint in [options]
	if (options.python_requires) {
		data.python_requires = options.python_requires
	}

	// Extras_require — [options.extras_require] section
	const extrasSection = sections['options.extras_require']
	if (extrasSection) {
		for (const [key, value] of Object.entries(extrasSection)) {
			data.extras_require[key] = splitMultiline(value)
		}
	}

	return setupCfgDataSchema.parse(data)
}

// ─── Source ──────────────────────────────────────────────────────────────────

export const pythonSetupCfgSource = defineSource<'pythonSetupCfg'>({
	async getInputs(context) {
		return getMatches(context.options, ['setup.cfg'])
	},
	key: 'pythonSetupCfg',
	async parseInput(input, context) {
		const content = await readFile(resolve(context.options.path, input), 'utf8')
		return { data: parse(content), source: input }
	},
	phase: 1,
})
