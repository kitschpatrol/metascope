import { defineTemplate } from '../metadata-types'
import { codeMetaJsonDataSchema } from '../sources/codemeta-json'
import { firstOf } from '../utilities/template-helpers'
import { codemeta as codemetaTemplate } from './codemeta'

export type TemplateDataMetadata = ReturnType<typeof metadata>

/**
 * Strip `git+` prefix and `.git` suffix from a URL.
 */
function normalizeGitUrl(url: string | undefined): string | undefined {
	if (url === undefined) return undefined
	let normalized = url
	if (normalized.startsWith('git+')) {
		normalized = normalized.slice(4)
	}

	if (normalized.endsWith('.git')) {
		normalized = normalized.slice(0, -4)
	}

	return normalized
}

/**
 * A minimal metadata template for populating a GitHub repository's
 * description, homepage, and topics via metadata.json / metadata.yaml.
 *
 * Builds on the codemeta template for baseline values, then lets any
 * metadata.json source fields override the result.
 */
export const metadata = defineTemplate((context, templateData) => {
	const codemetaTemplateOutput = codemetaTemplate(context, templateData)
	const codemeta = codeMetaJsonDataSchema.parse(codemetaTemplateOutput)

	const metadataFile = firstOf(context.metadataFile)?.data

	const homepage = metadataFile?.homepage ?? codemeta.url ?? codemeta.codeRepository

	return {
		description: metadataFile?.description ?? codemeta.description,
		homepage: normalizeGitUrl(homepage),
		topics: metadataFile?.keywords ?? codemeta.keywords,
	}
})
