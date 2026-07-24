import type { TemplateDataCodemeta } from './codemeta'
import type { TemplateDataCodemetaJson } from './codemeta-json'
import type { TemplateDataFrontmatter } from './frontmatter'
import type { TemplateDataMetadata } from './metadata'
import type { TemplateDataProject } from './project'
import { codemeta } from './codemeta'
import { codemetaJson } from './codemeta-json'
import { frontmatter } from './frontmatter'
import { metadata } from './metadata'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates = {
	codemeta,
	codemetaJson,
	frontmatter,
	metadata,
	project,
}

/**
 * Maps built-in template names to their return types.
 */
export type TemplateMap = {
	codemeta: TemplateDataCodemeta
	codemetaJson: TemplateDataCodemetaJson
	frontmatter: TemplateDataFrontmatter
	metadata: TemplateDataMetadata
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
	return typeof value === 'string' && Object.hasOwn(templates, value)
}
