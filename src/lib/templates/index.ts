import type { Template } from '../metadata-types'
import { obsidian } from './obsidian'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates: Partial<Record<string, Template<unknown>>> = {
	obsidian,
	project,
}
