import type { TemplateDataCodemeta } from './codemeta'
import type { TemplateDataFrontmatter } from './frontmatter'
import type { TemplateDataProject } from './project'
import { codemeta } from './codemeta'
import { frontmatter } from './frontmatter'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates = {
	codemeta,
	frontmatter,
	project,
}

/**
 * Maps built-in template names to their return types.
 */
export type TemplateMap = {
	codemeta: TemplateDataCodemeta
	frontmatter: TemplateDataFrontmatter
	project: TemplateDataProject
}

/**
 * Names of built-in templates.
 */
export type TemplateName = keyof TemplateMap

/**
 * Type guard
 */
export function isKeyOfTemplate(value: unknown): value is keyof typeof templates {
	return typeof value === 'string' && value in templates
}
