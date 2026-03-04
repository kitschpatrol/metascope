import type { Template } from '../metadata-types'
import { frontmatter } from './frontmatter'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates: Record<string, Template<unknown>> = {
	frontmatter,
	project,
}

/**
 * Maps built-in template names to their return types.
 */
export type TemplateMap = {
	frontmatter: ReturnType<typeof frontmatter>
	project: ReturnType<typeof project>
}

/**
 * Names of built-in templates.
 */
export type TemplateName = keyof TemplateMap
