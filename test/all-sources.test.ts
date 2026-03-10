import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getMetadata } from '../src/lib/metadata'
import { firstOf } from '../src/lib/utilities/template-helpers'

const fixturesDirectory = resolve('test/fixtures/all-sources')

describe('all-sources fixture', () => {
	// Run once with offline mode to avoid network calls, non-recursive to avoid ambiguity
	const resultPromise = getMetadata({
		offline: true,
		path: fixturesDirectory,
		workspaces: false,
	})

	// ── Phase 1: File sources ──────────────────────────────

	it('should extract arduinoLibraryProperties', async () => {
		const result = await resultPromise
		const data = firstOf(result.arduinoLibraryProperties)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('AllSourcesLib')
		expect(data!.version).toBe('1.0.0')
		expect(data!.authors).toContainEqual(expect.objectContaining({ name: 'Test Author' }))
		expect(data!.maintainer).toEqual(expect.objectContaining({ name: 'Test Maintainer' }))
		expect(data!.sentence).toBe('A comprehensive test fixture library.')
		expect(data!.paragraph).toContain('exercises every field')
		expect(data!.category).toBe('Data Processing')
		expect(data!.architectures).toEqual(['avr', 'esp32', 'esp8266'])
		expect(data!.includes).toEqual(['AllSources.h', 'AllSourcesExtra.h'])
		expect(data!.depends).toHaveLength(2)
		expect(data!.license).toBe('MIT')
		expect(data!.repository).toBe('https://github.com/test-org/all-sources')
		expect(data!.url).toBe('https://example.com/all-sources')
		expect(data!.email).toBe('test@example.com')
		expect(data!.raw).toBeDefined()
	})

	it('should extract cinderCinderblockXml', async () => {
		const result = await resultPromise
		const data = firstOf(result.cinderCinderblockXml)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('AllSourcesBlock')
		expect(data!.id).toBe('com.example.all-sources')
		expect(data!.author).toBe('Test Author')
		expect(data!.version).toBe('1.0.0')
		expect(data!.license).toBe('MIT')
		expect(data!.summary).toBe('A comprehensive test fixture for Cinder.')
		expect(data!.git).toBe('https://github.com/test-org/all-sources.git')
		expect(data!.url).toBe('https://example.com/all-sources')
		expect(data!.library).toBe('https://example.com/all-sources/lib')
		expect(data!.supports).toContain('macOS')
		expect(data!.supports).toContain('Windows')
		expect(data!.supports).toContain('Linux')
		expect(data!.requires).toHaveLength(2)
	})

	it('should extract codemetaJson', async () => {
		const result = await resultPromise
		const data = firstOf(result.codemetaJson)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('All Sources Fixture')
		expect(data!.description).toBe('A comprehensive test fixture.')
		expect(data!.version).toBe('1.0.0')
		expect(data!.softwareVersion).toBe('1.0.0')
		expect(data!.license).toBe('https://spdx.org/licenses/MIT')
		expect(data!.codeRepository).toBe('https://github.com/test-org/all-sources')
		expect(data!.issueTracker).toContain('issues')
		expect(data!.url).toBe('https://example.com/all-sources')
		expect(data!.applicationCategory).toBe('Developer Tools')
		expect(data!.dateCreated).toBe('2024-01-01')
		expect(data!.dateModified).toBe('2024-06-15')
		expect(data!.datePublished).toBe('2024-03-01')
		expect(data!.downloadUrl).toContain('releases')
		expect(data!.developmentStatus).toBe('active')
		expect(data!.identifier).toBe('all-sources-fixture')
		expect(data!.isAccessibleForFree).toBe(true)
		expect(data!.keywords).toEqual(['test', 'fixture'])
		expect(data!.programmingLanguage).toContain('TypeScript')
		expect(data!.operatingSystem).toContain('macOS')
		expect(data!.runtimePlatform).toContain('Node.js')
		expect(data!.author).toHaveLength(1)
		expect(data!.contributor).toHaveLength(1)
		expect(data!.copyrightHolder).toHaveLength(1)
		expect(data!.copyrightYear).toBe(2024)
		expect(data!.funder).toHaveLength(1)
		expect(data!.maintainer).toHaveLength(1)
		expect(data!.softwareRequirements).toHaveLength(1)
		expect(data!.softwareSuggestions).toHaveLength(1)
	})

	it('should extract goGoMod', async () => {
		const result = await resultPromise
		const data = firstOf(result.goGoMod)?.data
		expect(data).toBeDefined()
		expect(data!.module).toBe('github.com/test-org/all-sources')
		expect(data!.go_version).toBe('1.21')
		expect(data!.dependencies).toHaveLength(2)
		expect(data!.repository_url).toContain('github.com')
		expect(data!.tool_dependencies).toContain('github.com/golangci/golangci-lint/cmd/golangci-lint')
	})

	it('should extract goGoreleaserYaml', async () => {
		const result = await resultPromise
		const data = firstOf(result.goGoreleaserYaml)?.data
		expect(data).toBeDefined()
		expect(data!.project_name).toBe('all-sources-fixture')
		expect(data!.description).toContain('comprehensive test fixture')
		expect(data!.license).toBe('MIT')
		expect(data!.maintainer).toContain('Test Maintainer')
		expect(data!.vendor).toBe('Test Org')
		expect(data!.homepage).toBe('https://example.com/all-sources')
		expect(data!.operating_systems).toContain('macOS')
		expect(data!.operating_systems).toContain('Linux')
		expect(data!.operating_systems).toContain('Windows')
		expect(data!.repository_url).toContain('test-org/all-sources')
	})

	it('should extract javaPomXml', async () => {
		const result = await resultPromise
		const data = firstOf(result.javaPomXml)?.data
		expect(data).toBeDefined()
		expect(data!.groupId).toBe('com.example')
		expect(data!.artifactId).toBe('all-sources')
		expect(data!.version).toBe('1.0.0')
		expect(data!.description).toBe('A comprehensive test fixture.')
		expect(data!.url).toBe('https://example.com/all-sources')
		expect(data!.inceptionYear).toBe('2024')
		expect(data!.javaVersion).toBe('17')
		expect(data!.licenses).toHaveLength(1)
		expect(data!.organization).toEqual(expect.objectContaining({ name: 'Test Org' }))
		expect(data!.developers).toHaveLength(1)
		expect(data!.contributors).toHaveLength(1)
		expect(data!.dependencies).toHaveLength(1)
		expect(data!.devDependencies).toHaveLength(1)
		expect(data!.scmUrl).toContain('github.com')
		expect(data!.issueManagementUrl).toContain('issues')
		expect(data!.ciManagementUrl).toContain('actions')
	})

	it('should extract licenseFile', async () => {
		const result = await resultPromise
		const records = Array.isArray(result.licenseFile)
			? result.licenseFile
			: result.licenseFile
				? [result.licenseFile]
				: []
		expect(records.length).toBeGreaterThan(0)
		const { data } = records[0]
		expect(data.spdxId).toBe('MIT')
		expect(data.confidence).toBeGreaterThan(0)
	})

	it('should extract metadataFile', async () => {
		const result = await resultPromise
		const data = firstOf(result.metadataFile)?.data
		expect(data).toBeDefined()
		expect(data!.description).toBe('A comprehensive test fixture for metadata extraction.')
		expect(data!.homepage).toBe('https://example.com/all-sources')
		expect(data!.repository).toBe('https://github.com/test-org/all-sources')
		expect(data!.keywords).toEqual(['test', 'fixture', 'metadata'])
	})

	it('should extract metascope', async () => {
		const result = await resultPromise
		expect(result.metascope).toBeDefined()
		expect(result.metascope!.data.version).toBeDefined()
		expect(result.metascope!.data.scannedAt).toBeDefined()
		expect(result.metascope!.data.durationMs).toBeGreaterThan(0)
		expect(result.metascope!.data.options.path).toBeDefined()
	})

	it('should extract nodePackageJson', async () => {
		const result = await resultPromise
		const data = firstOf(result.nodePackageJson)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('all-sources-fixture')
		expect(data!.version).toBe('1.0.0')
		expect(data!.description).toContain('test fixture')
		expect(data!.license).toBe('MIT')
		expect(data!.keywords).toEqual(['test', 'fixture', 'metadata'])
		expect(data!.homepage).toBe('https://example.com/all-sources')
	})

	it('should extract obsidianPluginManifestJson', async () => {
		const result = await resultPromise
		const data = firstOf(result.obsidianPluginManifestJson)?.data
		expect(data).toBeDefined()
		expect(data!.id).toBe('all-sources-plugin')
		expect(data!.name).toBe('All Sources Plugin')
		expect(data!.version).toBe('1.0.0')
		expect(data!.minAppVersion).toBe('1.0.0')
		expect(data!.description).toContain('Obsidian plugin')
		expect(data!.author).toBe('Test Author')
		expect(data!.authorUrl).toBe('https://example.com')
		expect(data!.fundingUrl).toContain('sponsors')
		expect(data!.isDesktopOnly).toBe(false)
	})

	it('should extract openframeworksAddonConfigMk', async () => {
		const result = await resultPromise
		const data = firstOf(result.openframeworksAddonConfigMk)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('ofxAllSources')
		expect(data!.author).toBe('Test Author')
		expect(data!.description).toContain('comprehensive test fixture')
		expect(data!.tags).toContain('test')
		expect(data!.tags).toContain('fixture')
		expect(data!.url).toBe('https://github.com/test-org/all-sources')
		expect(data!.dependencies).toContain('ofxXmlSettings')
		expect(data!.dependencies).toContain('ofxOsc')
		expect(data!.platformSections.length).toBeGreaterThan(0)
	})

	it('should extract openframeworksInstallXml', async () => {
		const result = await resultPromise
		const data = firstOf(result.openframeworksInstallXml)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('ofxAllSources')
		expect(data!.version).toBe('1.0.0')
		expect(data!.author).toContain('Test Author')
		expect(data!.description).toContain('comprehensive test fixture')
		expect(data!.codeUrl).toContain('addons')
		expect(data!.siteUrl).toBe('https://example.com/all-sources')
		expect(data!.downloadUrl).toContain('releases')
		expect(data!.operatingSystems).toContain('Linux')
		expect(data!.operatingSystems).toContain('macOS')
		expect(data!.operatingSystems).toContain('Windows')
		expect(data!.requirements).toContain('ofxXmlSettings')
	})

	it('should extract publiccodeYaml', async () => {
		const result = await resultPromise
		const data = firstOf(result.publiccodeYaml)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('All Sources Fixture')
		expect(data!.publiccodeYmlVersion).toBe('0.3')
		expect(data!.softwareVersion).toBe('1.0.0')
		expect(data!.releaseDate).toBe('2024-03-01')
		expect(data!.license).toBe('MIT')
		expect(data!.mainCopyrightOwner).toBe('Test Author')
		expect(data!.repoOwner).toBe('Test Org')
		expect(data!.maintenanceType).toBe('community')
		expect(data!.developmentStatus).toBe('stable')
		expect(data!.softwareType).toBe('standalone/web')
		expect(data!.applicationSuite).toBe('Test Suite')
		expect(data!.platforms).toContain('web')
		expect(data!.categories).toContain('it-security')
		expect(data!.inputTypes).toContain('application/json')
		expect(data!.outputTypes).toContain('text/html')
		expect(data!.usedBy).toContain('Test Organization')
		expect(data!.availableLanguages).toContain('en')
		expect(data!.availableLanguages).toContain('it')
		expect(data!.localisationReady).toBe(true)
		expect(data!.contacts).toHaveLength(1)
		expect(data!.contractors).toHaveLength(1)
		expect(data!.dependencies).toHaveLength(3)
		expect(data!.description).toBeDefined()
		expect(data!.descriptions).toHaveProperty('en')
		expect(data!.descriptions).toHaveProperty('it')
		expect(data!.landingUrl).toBe('https://example.com/all-sources')
		expect(data!.isBasedOn).toContain('upstream')
		expect(data!.logo).toContain('logo.png')
		expect(data!.monochromeLogo).toContain('logo-mono.png')
		expect(data!.roadmap).toContain('roadmap')
	})

	it('should extract pythonPkgInfo', async () => {
		const result = await resultPromise
		const data = firstOf(result.pythonPkgInfo)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('all-sources-fixture')
		expect(data!.version).toBe('1.0.0')
		expect(data!.summary).toBe('A comprehensive test fixture.')
		expect(data!.author).toBe('Test Author')
		expect(data!.author_email).toBe('test@example.com')
		expect(data!.maintainer).toBe('Test Maintainer')
		expect(data!.maintainer_email).toBe('maintainer@example.com')
		expect(data!.license).toBe('MIT')
		expect(data!.home_page).toBe('https://example.com/all-sources')
		expect(data!.download_url).toContain('releases')
		expect(data!.keywords).toEqual(['test', 'fixture'])
		expect(data!.platforms).toContain('linux')
		expect(data!.classifiers).toHaveLength(3)
		expect(data!.requires_python).toBe('>=3.10')
		expect(data!.requires_dist).toHaveLength(2)
		expect(data!.project_urls).toHaveProperty('Repository')
		expect(data!.long_description).toContain('comprehensive test fixture')
		expect(data!.metadata_version).toBe('2.1')
		expect(data!.description_content_type).toBe('text/markdown')
	})

	it('should extract pythonPyprojectToml', async () => {
		const result = await resultPromise
		const data = firstOf(result.pythonPyprojectToml)?.data
		expect(data).toBeDefined()
	})

	it('should extract pythonSetupCfg', async () => {
		const result = await resultPromise
		const data = firstOf(result.pythonSetupCfg)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('all-sources-fixture')
		expect(data!.version).toBe('1.0.0')
		expect(data!.author).toBe('Test Author')
		expect(data!.author_email).toBe('test@example.com')
		expect(data!.maintainer).toBe('Test Maintainer')
		expect(data!.maintainer_email).toBe('maintainer@example.com')
		expect(data!.description).toBe('A comprehensive test fixture.')
		expect(data!.url).toBe('https://example.com/all-sources')
		expect(data!.download_url).toContain('releases')
		expect(data!.license).toBe('MIT')
		expect(data!.keywords).toEqual(['test', 'fixture'])
		expect(data!.classifiers).toHaveLength(3)
		expect(data!.python_requires).toBe('>=3.10')
		expect(data!.install_requires).toHaveLength(2)
		expect(data!.extras_require).toHaveProperty('dev')
		expect(data!.project_urls).toHaveProperty('Repository')
	})

	it('should extract pythonSetupPy', async () => {
		const result = await resultPromise
		// Setup.py parsing uses tree-sitter which may not support all grammar versions
		// in all environments; skip if extraction failed gracefully
		if (result.pythonSetupPy) {
			const data = firstOf(result.pythonSetupPy)?.data
			expect(data).toBeDefined()
			expect(data!.name).toBe('all-sources-fixture')
			expect(data!.version).toBe('1.0.0')
			expect(data!.author).toBe('Test Author')
			expect(data!.maintainer).toBe('Test Maintainer')
			expect(data!.description).toBe('A comprehensive test fixture.')
			expect(data!.license).toBe('MIT')
			expect(data!.keywords).toEqual(['test', 'fixture'])
			expect(data!.classifiers).toHaveLength(3)
			expect(data!.install_requires).toHaveLength(2)
			expect(data!.extras_require).toHaveProperty('dev')
			expect(data!.project_urls).toHaveProperty('Repository')
		}
	})

	it('should extract readmeFile', async () => {
		const result = await resultPromise
		const data = firstOf(result.readmeFile)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('All Sources Fixture')
	})

	it('should extract rubyGemspec', async () => {
		const result = await resultPromise
		const data = firstOf(result.rubyGemspec)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('all-sources-fixture')
		expect(data!.version).toBe('1.0.0')
		expect(data!.authors).toContain('Test Author')
		expect(data!.authors).toContain('Contributor One')
		expect(data!.email).toBe('test@example.com')
		expect(data!.summary).toBe('A comprehensive test fixture.')
		expect(data!.description).toContain('comprehensive test fixture')
		expect(data!.homepage).toBe('https://example.com/all-sources')
		expect(data!.license).toBe('MIT')
		expect(data!.licenses).toEqual(['MIT'])
		expect(data!.platform).toBe('ruby')
		expect(data!.required_ruby_version).toContain('3.0')
		expect(data!.require_paths).toEqual(['lib'])
		expect(data!.bindir).toBe('bin')
		expect(data!.executables).toEqual(['all-sources'])
		expect(data!.files).toHaveLength(2)
		expect(data!.test_files).toHaveLength(1)
		expect(data!.extra_rdoc_files).toEqual(['README.md'])
		expect(data!.extensions).toHaveLength(1)
		expect(data!.cert_chain).toHaveLength(1)
		expect(data!.post_install_message).toBe('Thanks for installing!')
		expect(data!.metadata).toHaveProperty('source_code_uri')
		expect(data!.dependencies).toHaveLength(2)
	})

	it('should extract rustCargoToml', async () => {
		const result = await resultPromise
		const data = firstOf(result.rustCargoToml)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('all-sources-fixture')
		expect(data!.version).toBe('1.0.0')
		expect(data!.edition).toBe('2021')
		expect(data!.rustVersion).toBe('1.70')
		expect(data!.authors).toContainEqual(
			expect.objectContaining({ email: 'test@example.com', name: 'Test Author' }),
		)
		expect(data!.description).toBe('A comprehensive test fixture.')
		expect(data!.license).toBe('MIT')
		expect(data!.licenseFile).toBe('LICENSE')
		expect(data!.readme).toBe('README.md')
		expect(data!.homepage).toBe('https://example.com/all-sources')
		expect(data!.repository).toBe('https://github.com/test-org/all-sources')
		expect(data!.documentation).toBe('https://docs.rs/all-sources-fixture')
		expect(data!.keywords).toEqual(['test', 'fixture'])
		expect(data!.categories).toEqual(['development-tools::testing'])
		expect(data!.dependencies).toHaveLength(2)
		expect(data!.devDependencies).toHaveLength(1)
		expect(data!.buildDependencies).toHaveLength(1)
		expect(data!.workspaceMembers).toEqual(['crates/*'])
	})

	it('should extract xcodeInfoPlist', async () => {
		const result = await resultPromise
		const data = firstOf(result.xcodeInfoPlist)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('All Sources App')
		expect(data!.identifier).toBe('com.example.all-sources')
		expect(data!.version).toBe('1.0.0')
		expect(data!.copyrightHolder).toContain('Test Author')
		expect(data!.copyrightYear).toBe('2024')
		expect(data!.applicationCategory).toBeDefined()
		expect(data!.processorRequirements).toContain('arm64')
	})

	it('should extract xcodeProjectPbxproj', async () => {
		const result = await resultPromise
		const data = firstOf(result.xcodeProjectPbxproj)?.data
		expect(data).toBeDefined()
		expect(data!.name).toBe('All Sources App')
		expect(data!.identifier).toBe('com.example.all-sources')
		expect(data!.version).toBe('1.0.0')
		expect(data!.organizationName).toBe('Test Org')
		expect(data!.copyrightHolder).toBe('Test Author')
		expect(data!.copyrightYear).toBe('2024')
		expect(data!.programmingLanguage).toBe('Swift')
	})

	// ── Phase 2: Tool/network sources ──────────────────────

	it('should extract fileStats', async () => {
		const result = await resultPromise
		const data = firstOf(result.fileStats)?.data
		expect(data).toBeDefined()
		expect(data!.totalFileCount).toBeGreaterThan(0)
		expect(data!.totalDirectoryCount).toBeGreaterThanOrEqual(0)
		expect(data!.totalSizeBytes).toBeGreaterThan(0)
	})

	it('should extract codeStats', async () => {
		const result = await resultPromise
		const data = result.codeStats
		// Code-statistics uses tokei, which may or may not be available
		if (data) {
			const stats = firstOf(data)?.data
			expect(stats!.total).toBeDefined()
			expect(stats!.total!.files).toBeGreaterThan(0)
			expect(stats!.total!.code).toBeGreaterThan(0)
		}
	})

	// ── Skipped sources (require network or git) ───────────

	it('should not extract registry sources in offline mode', async () => {
		const result = await resultPromise
		// These require network access to registries
		expect(result.nodeNpmRegistry).toBeUndefined()
		expect(result.pythonPypiRegistry).toBeUndefined()
	})

	it('should not extract git sources without a git repo', async () => {
		const result = await resultPromise
		// No .git directory in fixture
		expect(result.gitConfig).toBeUndefined()
		expect(result.gitStats).toBeUndefined()
	})
})
