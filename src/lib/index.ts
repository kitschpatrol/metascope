export { setLogger } from './log'

export { getMetadata } from './metadata'
export { DEFAULT_GET_METADATA_OPTIONS, defineTemplate } from './metadata-types'
export type {
	Credentials,
	GetMetadataOptions,
	GetMetadataTemplateOptions,
	MetadataContext,
	SourceName,
	Template,
	TemplateData,
} from './metadata-types'
export type { OneOrMany, SourceRecord } from './source'
export type { TemplateDataCodemeta } from './templates/codemeta'
export type { TemplateDataFrontmatter } from './templates/frontmatter'
export { templates } from './templates/index'
export type { TemplateDataProject } from './templates/project'

export * as helpers from './utilities/template-helpers'
