import type { Template } from '../types'
import { summary } from './summary'

/**
 * Built-in preset templates, keyed by name.
 */
export const presets: Partial<Record<string, Template<unknown>>> = {
	summary,
}
