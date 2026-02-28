import type { Template } from '../types'
import { project } from './project'
import { summary } from './summary'

/**
 * Built-in templates, keyed by name.
 */
export const templates: Partial<Record<string, Template<unknown>>> = {
	project,
	summary,
}
