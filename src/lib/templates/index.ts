import type { Template } from '../metadata-types'
import { frontmatter } from './frontmatter'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates: Partial<Record<string, Template<unknown>>> = {
	frontmatter,
	project,
}
