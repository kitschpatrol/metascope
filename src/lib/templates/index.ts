import type { Template } from '../types'
import { flat } from './flat'
import { project } from './project'

/**
 * Built-in templates, keyed by name.
 */
export const templates: Partial<Record<string, Template<unknown>>> = {
	flat,
	project,
}
