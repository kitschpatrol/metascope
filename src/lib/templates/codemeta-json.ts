import { defineTemplate } from '../metadata-types'
import { codeMetaJsonDataSchema } from '../sources/codemeta-json'
import { codemeta as codemetaTemplate } from './codemeta'

export type TemplateDataCodemetaJson = ReturnType<typeof codemetaJson>

/**
 * A JSON-friendly derivation of the `codemeta` template. Produces the same
 * aggregated metadata but parses it through a strict schema,stripping JSON-LD
 * artifacts (like `@context` and `@type`) to yield plain JSON suitable for
 * consumption by tools that don't care to understand JSON-LD.
 *
 * This template also provides a handy baseline normalization abstraction for
 * the other templates.
 */
export const codemetaJson = defineTemplate((context, templateData) => {
	// Let the codemeta template do the heavy aggregation...
	const codemetaTemplateOutput = codemetaTemplate(context, templateData)
	return codeMetaJsonDataSchema.parse(codemetaTemplateOutput)
})
