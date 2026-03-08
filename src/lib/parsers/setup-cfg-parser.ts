// ─── Types ───────────────────────────────────────────────────────────────────

/** Parsed setup.cfg metadata */
export type SetupCfgData = {
	author: null | string
	author_email: null | string
	classifiers: string[]
	description: null | string
	download_url: null | string
	extras_require: Record<string, string[]>
	install_requires: string[]
	keywords: null | string[]
	license: null | string
	long_description: null | string
	maintainer: null | string
	maintainer_email: null | string
	name: null | string
	project_urls: Record<string, string>
	python_requires: null | string
	url: null | string
	version: null | string
}

// ─── INI parser ──────────────────────────────────────────────────────────────

/**
 * Parse a setup.cfg INI-style file into sections with key-value pairs.
 * Handles Python ConfigParser conventions: multi-line values via indented
 * continuation lines, `#` and `;` comments.
 */
function parseSetupCfgIni(content: string): Record<string, Record<string, string>> {
	const sections: Record<string, Record<string, string>> = {}
	let currentSection = ''
	let lastKey = ''

	for (const line of content.split('\n')) {
		const trimmed = line.trimEnd()

		// Skip empty lines and comments
		if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) {
			continue
		}

		// Section header
		const sectionMatch = /^\[([^\]]+)\]/.exec(trimmed)
		if (sectionMatch) {
			currentSection = sectionMatch[1]
			sections[currentSection] ??= {}
			lastKey = ''
			continue
		}

		// Continuation line (starts with whitespace and we have a current key)
		if (/^\s/.test(line) && lastKey && currentSection) {
			const existing = sections[currentSection][lastKey]
			const continuation = trimmed.trim()
			if (continuation) {
				sections[currentSection][lastKey] = existing ? `${existing}\n${continuation}` : continuation
			}

			continue
		}

		// Key = value pair (supports both = and : as delimiters)
		const kvMatch = /^([^=:]+)[=:](.*)$/.exec(trimmed)
		if (kvMatch && currentSection) {
			const key = kvMatch[1].trim()
			const value = kvMatch[2].trim()
			sections[currentSection] ??= {}
			sections[currentSection][key] = value
			lastKey = key
		}
	}

	return sections
}

/** Split a multi-line value into individual non-empty lines. */
function splitMultiline(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/** Simple string attributes to extract from [metadata]. */
const STRING_ATTRS = new Set<keyof SetupCfgData>([
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
export function parseSetupCfg(source: string): SetupCfgData {
	const sections = parseSetupCfgIni(source)
	const metadata = sections.metadata ?? {}
	const options = sections.options ?? {}

	const data: SetupCfgData = {
		author: null,
		author_email: null,
		classifiers: [],
		description: null,
		download_url: null,
		extras_require: {},
		install_requires: [],
		keywords: null,
		license: null,
		long_description: null,
		maintainer: null,
		maintainer_email: null,
		name: null,
		project_urls: {},
		python_requires: null,
		url: null,
		version: null,
	}

	// String attributes from [metadata]
	for (const key of STRING_ATTRS) {
		const value = metadata[key]
		if (value) {
			data[key] = value as never
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

	return data
}
