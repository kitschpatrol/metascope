export { setLogger } from './log'
export { getMetadata } from './metadata'
export { defineTemplate } from './metadata-types'
export type {
	CodeMetaData,
	Credentials,
	FilesystemData,
	GetMetadataOptions,
	GetMetadataTemplateOptions,
	GitConfig,
	GitData,
	GitHubData,
	LocData,
	LocLanguageEntry,
	LocLanguageStats,
	MetadataContext,
	MetascopeData,
	NpmData,
	ObsidianData,
	ObsidianManifest,
	PackageData,
	PypiData,
	PyprojectData,
	SourceName,
	Template,
	TemplateData,
	UpdatesData,
	UpdatesPackage,
} from './metadata-types'
export { templates } from './templates/index'
export type { TemplateMap, TemplateName } from './templates/index'
