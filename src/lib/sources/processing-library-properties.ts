import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ProcessingLibraryProperties } from '../parsers/processing-library-properties-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseProcessingLibraryProperties } from '../parsers/processing-library-properties-parser'

export type {
	ProcessingLibraryPropertiesAuthorEntry,
	ProcessingLibraryPropertiesCategory,
} from '../parsers/processing-library-properties-parser'

export type ProcessingLibraryPropertiesData = Partial<ProcessingLibraryProperties>

/** Processing-specific fields that distinguish from Arduino. */
const PROCESSING_SPECIFIC_FIELDS = new Set([
	'authorList',
	'authors',
	'dependencies',
	'minrevision',
	'prettyversion',
])

/** Arduino-exclusive fields that rule out Processing. */
const ARDUINO_EXCLUSIVE_FIELDS = new Set(['architectures', 'depends', 'maintainer'])

/**
 * Validate that a library.properties file is Processing (not Arduino).
 * Requires name= and version=, plus Processing-specific author/version fields
 * and no Arduino-exclusive fields.
 */
function isProcessingLibraryProperties(content: string): boolean {
	const lines = content.split(/\r?\n/)
	const keys = new Set<string>()

	for (const rawLine of lines) {
		const line = rawLine.trim()
		if (line.length === 0 || line.startsWith('#')) continue
		const eqIndex = line.indexOf('=')
		if (eqIndex === -1) continue
		keys.add(line.slice(0, eqIndex).trim().toLowerCase())
	}

	// Must have base fields
	if (!keys.has('name') || !keys.has('version')) return false

	// If any Arduino-exclusive field is present, it's not Processing
	for (const field of ARDUINO_EXCLUSIVE_FIELDS) {
		if (keys.has(field)) return false
	}

	// Must have at least one Processing-specific field
	for (const field of PROCESSING_SPECIFIC_FIELDS) {
		if (keys.has(field)) return true
	}

	return false
}

export const processingLibraryPropertiesSource: MetadataSource<'processingLibraryProperties'> = {
	async extract(context: SourceContext): Promise<ProcessingLibraryPropertiesData> {
		log.debug('Extracting Processing library.properties metadata...')

		const content = await readFile(resolve(context.path, 'library.properties'), 'utf8')
		return parseProcessingLibraryProperties(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			const content = await readFile(resolve(context.path, 'library.properties'), 'utf8')
			return isProcessingLibraryProperties(content)
		} catch {
			return false
		}
	},
	key: 'processingLibraryProperties',
}
