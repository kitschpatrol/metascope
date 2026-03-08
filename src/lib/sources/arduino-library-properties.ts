import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ArduinoLibraryProperties } from '../parsers/arduino-library-properties-parser'
import type { MetadataSource, SourceContext } from './source'
import { log } from '../log'
import { parseArduinoLibraryProperties } from '../parsers/arduino-library-properties-parser'

export type {
	ArduinoLibraryPropertiesCategory,
	ArduinoLibraryPropertiesDependencyEntry,
	ArduinoLibraryPropertiesPersonEntry,
} from '../parsers/arduino-library-properties-parser'

export type ArduinoLibraryPropertiesData = Partial<ArduinoLibraryProperties>

/**
 * Arduino-specific fields that distinguish library.properties from
 * Processing's identically-named format.
 */
const ARDUINO_SPECIFIC_FIELDS = new Set(['architectures', 'depends', 'dot_a_linkage', 'maintainer'])

/** Processing-exclusive fields that rule out Arduino. */
const PROCESSING_EXCLUSIVE_FIELDS = new Set(['authors', 'minrevision', 'prettyversion'])

/**
 * Validate that a library.properties file is Arduino (not Processing).
 * Requires name=, version=, author= and either an Arduino-specific field
 * or no Processing-exclusive fields.
 */
function isArduinoLibraryProperties(content: string): boolean {
	const lines = content.split(/\r?\n/)
	const keys = new Set<string>()

	for (const rawLine of lines) {
		const line = rawLine.trim()
		if (line.length === 0 || line.startsWith('#')) continue
		const eqIndex = line.indexOf('=')
		if (eqIndex === -1) continue
		keys.add(line.slice(0, eqIndex).trim())
	}

	// Must have the three base fields
	if (!keys.has('name') || !keys.has('version') || !keys.has('author')) return false

	// If any Arduino-specific field is present, it's Arduino
	for (const field of ARDUINO_SPECIFIC_FIELDS) {
		if (keys.has(field)) return true
	}

	// If any Processing-exclusive field is present, it's not Arduino
	for (const field of PROCESSING_EXCLUSIVE_FIELDS) {
		if (keys.has(field)) return false
	}

	// Ambiguous but default to Arduino
	return true
}

export const arduinoLibraryPropertiesSource: MetadataSource<'arduinoLibraryProperties'> = {
	async extract(context: SourceContext): Promise<ArduinoLibraryPropertiesData> {
		log.debug('Extracting Arduino library.properties metadata...')

		const content = await readFile(resolve(context.path, 'library.properties'), 'utf8')
		return parseArduinoLibraryProperties(content)
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		try {
			const content = await readFile(resolve(context.path, 'library.properties'), 'utf8')
			return isArduinoLibraryProperties(content)
		} catch {
			return false
		}
	},
	key: 'arduinoLibraryProperties',
}
