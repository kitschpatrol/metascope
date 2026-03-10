/* eslint-disable complexity */
/* eslint-disable ts/naming-convention */

/**
 * CodeMeta 3.0 JSON-LD template.
 *
 * Generates a valid codemeta.json (https://codemeta.github.io/) by cascading
 * data from all available metascope sources.
 *
 * ## Cascade strategy
 *
 * For **ecosystem-derived fields** (name, version, description, author,
 * license, dependencies, keywords, …) the ecosystem manifest is canonical.
 * This keeps the output fresh when e.g. a new dependency is added to
 * package.json, and makes the round-trip stable: generate → save as
 * codemeta.json → regenerate → identical output.
 *
 * For **codemeta-specific fields** that only exist in codemeta.json
 * (developmentStatus, funding, buildInstructions, …) the existing
 * codemeta.json is the source of truth.
 *
 * ## Software type inference
 *
 * Set `INFER_TARGET_PRODUCT` to `true` to enable heuristic inference of
 * `targetProduct` from available signals (bin field, browser field, etc.).
 */

import is from '@sindresorhus/is'
import type { MetadataContext } from '../metadata-types'
import { defineTemplate } from '../metadata-types'
import {
	collectArrayField,
	collectField,
	firstOf,
	nonEmpty,
	stripUndefined,
} from '../utilities/formatting'
import {
	deduplicateDependencies,
	deduplicatePersons,
	toDependencyLd,
	toPersonLd,
	toSpdxLicenseUrl,
} from '../utilities/codemeta-helpers'
import type { CodemetaDependencyLd, CodemetaPersonLd } from '../utilities/codemeta-helpers'

// ─── Feature flags ──────────────────────────────────────────────────

/**
 * Enable heuristic inference of `targetProduct` based on available signals.
 * When false, `targetProduct` is omitted from the output.
 */
const INFER_TARGET_PRODUCT = false as const

// ─── Template ───────────────────────────────────────────────────────

export const codemeta = defineTemplate(
	({
		arduinoLibraryProperties,
		cinderCinderblockXml,
		codemetaJson: codemetaRaw,
		github: githubRaw,
		gitStatistics: gitRaw,
		goGoMod,
		javaPomXml,
		licenseFiles,
		nodeNpmRegistry: npmRaw,
		nodePackageJson,
		obsidianPluginManifestJson,
		openframeworksAddonConfigMk,
		openframeworksInstallXml,
		processingLibraryProperties,
		publiccodeYaml,
		pythonPkgInfo,
		pythonPypiRegistry: pypiRaw,
		readmeFile,
		pythonPyprojectToml,
		pythonSetupCfg,
		pythonSetupPy,
		rubyGemspec,
		rustCargoToml,
		xcodeInfoPlist,
	}) => {
		// ── Extract first record from OneOrMany sources ──────────────

		const cm = firstOf(codemetaRaw)
		const github = firstOf(githubRaw)
		const git = firstOf(gitRaw)
		const npm = firstOf(npmRaw)
		const pypi = firstOf(pypiRaw)
		const pkg = firstOf(nodePackageJson)
		const pyproject = firstOf(pythonPyprojectToml)
		const setupPy = firstOf(pythonSetupPy)
		const setupCfg = firstOf(pythonSetupCfg)
		const pkgInfo = firstOf(pythonPkgInfo)
		const cargo = firstOf(rustCargoToml)
		const gem = firstOf(rubyGemspec)
		const pom = firstOf(javaPomXml)
		const goMod = firstOf(goGoMod)
		const arduino = firstOf(arduinoLibraryProperties)
		const processing = firstOf(processingLibraryProperties)
		const ofAddon = firstOf(openframeworksAddonConfigMk)
		const ofInstall = firstOf(openframeworksInstallXml)
		const cinder = firstOf(cinderCinderblockXml)
		const xcode = firstOf(xcodeInfoPlist)
		const obsidian = firstOf(obsidianPluginManifestJson)
		const publiccode = firstOf(publiccodeYaml)

		// ── Identity ────────────────────────────────────────────────

		const name =
			pkg?.data.name ??
			pyproject?.data.project?.name ??
			setupPy?.data.name ??
			setupCfg?.data.name ??
			pkgInfo?.data.name ??
			cargo?.data.name ??
			gem?.data.name ??
			pom?.data.name ??
			goMod?.data.module ??
			arduino?.data.name ??
			processing?.data.name ??
			ofAddon?.data.name ??
			ofInstall?.data.name ??
			cinder?.data.name ??
			xcode?.data.name ??
			obsidian?.data.name ??
			publiccode?.data.name ??
			cm?.data.name

		const description =
			pkg?.data.description ??
			pyproject?.data.project?.description ??
			setupPy?.data.description ??
			setupCfg?.data.description ??
			pkgInfo?.data.summary ??
			cargo?.data.description ??
			gem?.data.summary ??
			pom?.data.description ??
			arduino?.data.sentence ??
			processing?.data.sentence ??
			ofAddon?.data.description ??
			ofInstall?.data.description ??
			cinder?.data.summary ??
			xcode?.data.description ??
			obsidian?.data.description ??
			publiccode?.data.description?.shortDescription ??
			cm?.data.description ??
			github?.data.description

		const version =
			pkg?.data.version ??
			pyproject?.data.project?.version ??
			setupPy?.data.version ??
			setupCfg?.data.version ??
			pkgInfo?.data.version ??
			cargo?.data.version ??
			gem?.data.version ??
			pom?.data.version ??
			arduino?.data.version ??
			processing?.data.prettyVersion ??
			ofInstall?.data.version ??
			cinder?.data.version ??
			xcode?.data.version ??
			obsidian?.data.version ??
			publiccode?.data.softwareVersion ??
			cm?.data.version ??
			cm?.data.softwareVersion

		const identifier =
			pom?.data.identifier ??
			cinder?.data.id ??
			obsidian?.data.id ??
			xcode?.data.identifier ??
			cm?.data.identifier

		// ── Author ──────────────────────────────────────────────────

		const ecosystemAuthors: Array<CodemetaPersonLd | undefined> = [
			// Node package.json
			...(pkg?.data.author
				? [toPersonLd({ email: pkg.data.author.email, name: pkg.data.author.name, url: pkg.data.author.url })]
				: []),

			// Python pyproject.toml
			...(pyproject?.data.project?.authors ?? []).map((a) =>
				is.plainObject(a)
					? toPersonLd({ email: a.email, name: a.name })
					: toPersonLd({ name: a }),
			),

			// Python setup.py / setup.cfg
			...(setupPy?.data.author
				? [toPersonLd({ email: setupPy.data.author_email, name: setupPy.data.author })]
				: []),
			...(setupCfg?.data.author
				? [toPersonLd({ email: setupCfg.data.author_email, name: setupCfg.data.author })]
				: []),

			// Rust Cargo.toml
			...(cargo?.data.authors ?? []).map((a) =>
				toPersonLd({ email: a.email, name: a.name }),
			),

			// Ruby gemspec (authors + email paired by index)
			...gemspecAuthors(gem),

			// Java POM developers
			...(pom?.data.developers ?? []).map((d) =>
				toPersonLd({ affiliation: d.organization, email: d.email, name: d.name, url: d.url }),
			),

			// Arduino
			...(arduino?.data.authors ?? []).map((a) =>
				toPersonLd({ email: a.email, name: a.name }),
			),

			// Processing
			...(processing?.data.authors ?? []).map((a) =>
				toPersonLd({ name: a.name, url: a.url }),
			),

			// OpenFrameworks
			...(ofAddon?.data.author ? [toPersonLd({ name: ofAddon.data.author })] : []),
			...(ofInstall?.data.author ? [toPersonLd({ name: ofInstall.data.author })] : []),

			// Cinder
			...(cinder?.data.author ? [toPersonLd({ name: cinder.data.author })] : []),

			// Xcode
			...(xcode?.data.author
				? [toPersonLd({ email: xcode.data.authorEmail, name: xcode.data.author })]
				: []),

			// Obsidian
			...(obsidian?.data.author
				? [toPersonLd({ name: obsidian.data.author, url: obsidian.data.authorUrl })]
				: []),

			// publiccode.yml contacts
			...(publiccode?.data.contacts ?? []).map((c) =>
				toPersonLd({ affiliation: c.affiliation, email: c.email, name: c.name }),
			),
		]

		const cmAuthors = cm?.data.author?.map((p) =>
			toPersonLd({
				affiliation: p.affiliation, email: p.email, familyName: p.familyName,
				givenName: p.givenName, id: p.id, name: p.name, type: p.type, url: p.url,
			}),
		)

		const author = resolvePersons(ecosystemAuthors, cmAuthors)

		// ── Contributor ─────────────────────────────────────────────

		const ecosystemContributors: Array<CodemetaPersonLd | undefined> = [
			// Node package.json contributors
			...collectArrayField(nodePackageJson, (d) =>
				d.contributors?.map((c) =>
					is.plainObject(c)
						? toPersonLd({ email: c.email, name: c.name, url: c.url })
						: toPersonLd({ name: c }),
				),
			),

			// Java POM contributors
			...(pom?.data.contributors ?? []).map((c) =>
				toPersonLd({ affiliation: c.organization, email: c.email, name: c.name, url: c.url }),
			),
		]

		const cmContributors = cm?.data.contributor?.map((p) =>
			toPersonLd({
				affiliation: p.affiliation, email: p.email, familyName: p.familyName,
				givenName: p.givenName, id: p.id, name: p.name, type: p.type, url: p.url,
			}),
		)

		const contributor = resolvePersons(ecosystemContributors, cmContributors)

		// ── Maintainer ──────────────────────────────────────────────

		const ecosystemMaintainers: Array<CodemetaPersonLd | undefined> = [
			...(pyproject?.data.project?.maintainers ?? []).map((m) =>
				is.plainObject(m)
					? toPersonLd({ email: m.email, name: m.name })
					: toPersonLd({ name: m }),
			),
			...(setupPy?.data.maintainer
				? [toPersonLd({ email: setupPy.data.maintainer_email, name: setupPy.data.maintainer })]
				: []),
			...(setupCfg?.data.maintainer
				? [toPersonLd({ email: setupCfg.data.maintainer_email, name: setupCfg.data.maintainer })]
				: []),
			...(pkgInfo?.data.maintainer
				? [toPersonLd({ email: pkgInfo.data.maintainer_email, name: pkgInfo.data.maintainer })]
				: []),
			...(arduino?.data.maintainer
				? [toPersonLd({ email: arduino.data.maintainer.email, name: arduino.data.maintainer.name })]
				: []),
		]

		const cmMaintainers = cm?.data.maintainer?.map((p) =>
			toPersonLd({
				affiliation: p.affiliation, email: p.email, familyName: p.familyName,
				givenName: p.givenName, id: p.id, name: p.name, type: p.type, url: p.url,
			}),
		)

		const maintainer = resolvePersons(ecosystemMaintainers, cmMaintainers)

		// ── Copyright holder ────────────────────────────────────────

		const ecosystemCopyrightHolders: Array<CodemetaPersonLd | undefined> = [
			...(publiccode?.data.mainCopyrightOwner
				? [toPersonLd({ name: publiccode.data.mainCopyrightOwner })]
				: []),
			...(xcode?.data.copyrightHolder
				? [toPersonLd({ name: xcode.data.copyrightHolder })]
				: []),
		]

		const cmCopyrightHolders = cm?.data.copyrightHolder?.map((p) =>
			toPersonLd({
				affiliation: p.affiliation, email: p.email, familyName: p.familyName,
				givenName: p.givenName, id: p.id, name: p.name, type: p.type, url: p.url,
			}),
		)

		const copyrightHolder = resolvePersons(ecosystemCopyrightHolders, cmCopyrightHolders)

		// ── Funder ──────────────────────────────────────────────────

		const funder = resolvePersons(
			[],
			cm?.data.funder?.map((p) =>
				toPersonLd({
					affiliation: p.affiliation, email: p.email, familyName: p.familyName,
					givenName: p.givenName, id: p.id, name: p.name, type: p.type, url: p.url,
				}),
			),
		)

		// ── Code ────────────────────────────────────────────────────

		const codeRepository =
			github?.data.url ??
			cargo?.data.repository ??
			pom?.data.scmUrl ??
			goMod?.data.repository_url ??
			publiccode?.data.url ??
			arduino?.data.repository ??
			cinder?.data.git ??
			cm?.data.codeRepository ??
			repositoryUrlFromPackageJson(pkg?.data.repository)

		const programmingLanguage = nonEmpty([
			...(github?.data.primaryLanguage ? [github.data.primaryLanguage] : []),
			...(cm?.data.programmingLanguage ?? []),
		]) ?? nonEmpty(Object.keys(github?.data.languages ?? {}))

		const runtimePlatform = nonEmpty([
			...Object.keys(pkg?.data.engines ?? {}),
			...(goMod?.data.go_version ? [`go ${goMod.data.go_version}`] : []),
			...(cargo?.data.rustVersion ? [`rust ${cargo.data.rustVersion}`] : []),
			...(pyproject?.data.project?.requiresPython
				? [`python ${pyproject.data.project.requiresPython}`]
				: []),
			...(setupPy?.data.python_requires
				? [`python ${setupPy.data.python_requires}`]
				: []),
			...(gem?.data.required_ruby_version
				? [`ruby ${gem.data.required_ruby_version}`]
				: []),
			...(pom?.data.javaVersion
				? [`java ${pom.data.javaVersion}`]
				: []),
			...(cm?.data.runtimePlatform ?? []),
		])

		// ── Application ─────────────────────────────────────────────

		const operatingSystem = nonEmpty([
			...(cm?.data.operatingSystem ?? []),
			...(publiccode?.data.platforms ?? []),
			...(ofInstall?.data.operatingSystems ?? []),
			...(cinder?.data.supports ?? []),
			...(xcode?.data.operatingSystems ?? []),
		])

		const applicationCategory =
			cm?.data.applicationCategory ??
			xcode?.data.applicationCategory ??
			arduino?.data.category ??
			publiccode?.data.softwareType

		const applicationSubCategory =
			cm?.data.applicationSubCategory

		// ── Dependencies ────────────────────────────────────────────

		const runtimeDeps = collectRuntimeDeps({
			arduino, cargo, cinder, gem, goGoMod, javaPomXml, nodePackageJson,
			ofAddon, ofInstall, pkgInfo, publiccode, pyproject, rubyGemspec,
			setupCfg, setupPy,
		})

		const softwareRequirements = runtimeDeps.length > 0
			? deduplicateDependencies(runtimeDeps)
			: cm?.data.softwareRequirements?.map((d) =>
				toDependencyLd(d.name ?? d.identifier ?? '', d.version, d.identifier, d.runtimePlatform),
			)

		const devDeps = collectDevDeps({ cargo, gem, javaPomXml, nodePackageJson, rubyGemspec })

		const softwareSuggestions = devDeps.length > 0
			? deduplicateDependencies(devDeps)
			: cm?.data.softwareSuggestions?.map((d) =>
				toDependencyLd(d.name ?? d.identifier ?? '', d.version, d.identifier, d.runtimePlatform),
			)

		// ── Dates ───────────────────────────────────────────────────

		const dateCreated =
			git?.data.commitDateFirst ??
			github?.data.createdAt ??
			cm?.data.dateCreated

		const dateModified =
			git?.data.commitDateLast ??
			github?.data.pushedAt ??
			cm?.data.dateModified

		const datePublished =
			npm?.data.publishDateLatest ??
			pypi?.data.publishDateLatest ??
			publiccode?.data.releaseDate ??
			github?.data.releaseDateLatest ??
			git?.data.tagVersionDateLatest ??
			cm?.data.datePublished

		const copyrightYear =
			xcode?.data.copyrightYear ??
			pom?.data.inceptionYear ??
			(cm?.data.copyrightYear !== undefined ? String(cm.data.copyrightYear) : undefined)

		// ── License ─────────────────────────────────────────────────

		const rawLicense =
			pkg?.data.license ??
			cargo?.data.license ??
			resolvePythonLicense(pyproject?.data.project?.license) ??
			setupPy?.data.license ??
			setupCfg?.data.license ??
			gem?.data.license ??
			firstPomLicense(pom) ??
			arduino?.data.license ??
			cinder?.data.license ??
			publiccode?.data.license ??
			github?.data.licenseSpdxId ??
			collectField(licenseFiles, (d) => d.spdxId)[0] ??
			resolveCmLicense(cm?.data.license)

		const license = is.nonEmptyStringAndNotWhitespace(rawLicense)
			? toSpdxLicenseUrl(rawLicense)
			: undefined

		const isAccessibleForFree =
			cm?.data.isAccessibleForFree ??
			(github?.data.isPrivate === false ? true : undefined)

		// ── Keywords ────────────────────────────────────────────────

		const keywords = nonEmpty(
			deduplicateStrings([
				...(pkg?.data.keywords ?? []),
				...(pyproject?.data.project?.keywords ?? []),
				...(setupPy?.data.keywords ?? []),
				...(setupCfg?.data.keywords ?? []),
				...(pkgInfo?.data.keywords ?? []),
				...(cargo?.data.keywords ?? []),
				...(ofAddon?.data.tags ?? []),
				...(publiccode?.data.categories ?? []),
				...(github?.data.topics ?? []),
				...(cm?.data.keywords ?? []),
			]),
		)

		// ── URLs ────────────────────────────────────────────────────

		const url =
			pkg?.data.homepage ??
			cargo?.data.homepage ??
			setupPy?.data.url ??
			setupCfg?.data.url ??
			pkgInfo?.data.home_page ??
			gem?.data.homepage ??
			pom?.data.url ??
			arduino?.data.url ??
			processing?.data.url ??
			ofAddon?.data.url ??
			ofInstall?.data.siteUrl ??
			cinder?.data.url ??
			xcode?.data.url ??
			publiccode?.data.landingUrl ??
			github?.data.homepageUrl ??
			cm?.data.url

		const downloadUrl =
			ofInstall?.data.downloadUrl ??
			processing?.data.download ??
			npm?.data.url ??
			pypi?.data.url ??
			cm?.data.downloadUrl

		const issueTracker =
			bugsUrlFromPackageJson(pkg?.data.bugs) ??
			pom?.data.issueManagementUrl ??
			cm?.data.issueTracker ??
			(github?.data.hasIssuesEnabled ? `${github.data.url}/issues` : undefined)

		const continuousIntegration =
			pom?.data.ciManagementUrl ??
			cm?.data.continuousIntegration

		const softwareHelp =
			cargo?.data.documentation ??
			cm?.data.softwareHelp

		// ── Codemeta-specific (preserved from existing codemeta.json) ───

		const developmentStatus =
			publiccode?.data.developmentStatus ??
			cm?.data.developmentStatus

		const funding = cm?.data.funding
		const buildInstructions = cm?.data.buildInstructions
		const readme = readmeUrl(firstOf(readmeFile), codeRepository, github?.data.defaultBranch ?? git?.data.branchCurrent) ?? cm?.data.readme
		const releaseNotes = cm?.data.releaseNotes
		const installUrl = cm?.data.installUrl
		const relatedLink = cm?.data.relatedLink

		// ── Software type inference ────────────────────────────────

		const targetProduct = INFER_TARGET_PRODUCT
			? inferTargetProduct(pkg, obsidian)
			: undefined

		// ── Build the JSON-LD object ────────────────────────────────

		return stripUndefined({
			'@context': 'https://w3id.org/codemeta/3.0',
			'@type': 'SoftwareSourceCode',

			// Identity
			name,
			identifier,
			description,
			version,

			// People
			author,
			contributor,
			maintainer,
			copyrightHolder,
			funder,

			// Source code
			codeRepository,
			programmingLanguage,
			runtimePlatform,

			// Application
			applicationCategory,
			applicationSubCategory,
			operatingSystem,

			// Dependencies
			softwareRequirements,
			softwareSuggestions,

			// Dates
			dateCreated: toDateOnly(dateCreated),
			dateModified: toDateOnly(dateModified),
			datePublished: toDateOnly(datePublished),
			copyrightYear: is.nonEmptyStringAndNotWhitespace(copyrightYear)
				? Number.parseInt(copyrightYear, 10) || undefined
				: undefined,

			// License
			license,
			isAccessibleForFree,

			// Keywords
			keywords,

			// URLs
			url,
			downloadUrl,
			installUrl,
			issueTracker,
			continuousIntegration,
			buildInstructions,
			softwareHelp,
			readme,
			releaseNotes,
			relatedLink,

			// Development
			developmentStatus,
			funding,

			// Software type
			targetProduct,
		})
	},
)

// ─── Person Helpers ─────────────────────────────────────────────────

/**
 * Extract authors from a gemspec record.
 * Gemspec has `authors: string[]` and a separate `email: string | string[]`.
 * We pair them by index where possible.
 */
function gemspecAuthors(
	gem: ReturnType<typeof firstOf<{ data: { authors: string[]; email?: string | string[] } }>>,
): Array<CodemetaPersonLd | undefined> {
	if (gem === undefined) return []
	const emails = gem.data.email === undefined
		? []
		: Array.isArray(gem.data.email)
			? gem.data.email
			: [gem.data.email]

	return gem.data.authors.map((authorName, index) =>
		toPersonLd({ email: emails[index], name: authorName }),
	)
}

/**
 * Takes ecosystem persons (which may include undefined) and codemeta fallback persons.
 * Uses ecosystem if any are present, otherwise falls back.
 * Always deduplicates by name.
 */
function resolvePersons(
	ecosystemPersons: Array<CodemetaPersonLd | undefined>,
	fallbackPersons?: Array<CodemetaPersonLd | undefined>,
): CodemetaPersonLd[] | undefined {
	const ecosystem = ecosystemPersons.filter(
		(p): p is CodemetaPersonLd => p !== undefined,
	)

	if (ecosystem.length > 0) {
		return deduplicatePersons(ecosystem)
	}

	const fallback = (fallbackPersons ?? []).filter(
		(p): p is CodemetaPersonLd => p !== undefined,
	)

	return deduplicatePersons(fallback)
}

// ─── Dependency Helpers ─────────────────────────────────────────────

/**
 * Collect runtime dependencies from all ecosystem sources.
 */
function collectRuntimeDeps(sources: {
	arduino: ReturnType<typeof firstOf<{ data: { depends: Array<{ name: string; versionConstraint?: string }> } }>>,
	cargo: ReturnType<typeof firstOf<{ data: { dependencies: Array<{ name: string; version?: string }> } }>>,
	cinder: ReturnType<typeof firstOf<{ data: { requires: string[] } }>>,
	gem: ReturnType<typeof firstOf<{ data: { dependencies: Array<{ name: string; requirements: string[]; type: 'development' | 'runtime' }> } }>>,
	goGoMod: MetadataContext['goGoMod'],
	javaPomXml: MetadataContext['javaPomXml'],
	nodePackageJson: MetadataContext['nodePackageJson'],
	ofAddon: ReturnType<typeof firstOf<{ data: { dependencies: string[] } }>>,
	ofInstall: ReturnType<typeof firstOf<{ data: { requirements: string[] } }>>,
	pkgInfo: ReturnType<typeof firstOf<{ data: { requires_dist: string[] } }>>,
	publiccode: ReturnType<typeof firstOf<{ data: { dependencies: Array<{ name: string; version?: string }> } }>>,
	pyproject: ReturnType<typeof firstOf<{ data: { project?: { dependencies?: string[] } } }>>,
	rubyGemspec: MetadataContext['rubyGemspec'],
	setupCfg: ReturnType<typeof firstOf<{ data: { install_requires: string[] } }>>,
	setupPy: ReturnType<typeof firstOf<{ data: { install_requires: string[] } }>>,
}): CodemetaDependencyLd[] {
	const deps: CodemetaDependencyLd[] = []

	// Node package.json dependencies
	deps.push(
		...collectArrayField(sources.nodePackageJson, (d) =>
			objectEntriesToDeps(d.dependencies),
		),
	)

	// Python pyproject.toml dependencies
	deps.push(
		...(sources.pyproject?.data.project?.dependencies ?? []).map((dep) => parsePep508Dep(dep)),
	)

	// Python setup.py / setup.cfg install_requires
	deps.push(
		...(sources.setupPy?.data.install_requires ?? []).map((dep) => parsePep508Dep(dep)),
	)
	deps.push(
		...(sources.setupCfg?.data.install_requires ?? []).map((dep) => parsePep508Dep(dep)),
	)

	// Python PKG-INFO requires_dist
	deps.push(
		...(sources.pkgInfo?.data.requires_dist ?? []).map((dep) => parsePep508Dep(dep)),
	)

	// Rust Cargo.toml dependencies
	deps.push(
		...(sources.cargo?.data.dependencies ?? []).map((d) => toDependencyLd(d.name, d.version)),
	)

	// Ruby gemspec runtime dependencies
	deps.push(
		...collectArrayField(sources.rubyGemspec, (d) =>
			d.dependencies
				?.filter((dep: { type: string }) => dep.type === 'runtime')
				.map((dep: { name: string; requirements: string[] }) =>
					toDependencyLd(dep.name, dep.requirements.join(', ')),
				),
		),
	)

	// Java POM dependencies
	deps.push(
		...collectArrayField(sources.javaPomXml, (d) =>
			d.dependencies?.map((dep: { artifactId: string; groupId: string; version?: string }) =>
				toDependencyLd(dep.artifactId, dep.version, `${dep.groupId}:${dep.artifactId}`),
			),
		),
	)

	// Go go.mod dependencies
	deps.push(
		...collectArrayField(sources.goGoMod, (d) =>
			d.dependencies?.map((dep: { module: string; version: string }) =>
				toDependencyLd(dep.module, dep.version),
			),
		),
	)

	// Arduino depends
	deps.push(
		...(sources.arduino?.data.depends ?? []).map((d) => toDependencyLd(d.name, d.versionConstraint)),
	)

	// OpenFrameworks
	deps.push(
		...(sources.ofAddon?.data.dependencies ?? []).map((d) => toDependencyLd(d)),
	)
	deps.push(
		...(sources.ofInstall?.data.requirements ?? []).map((d) => toDependencyLd(d)),
	)

	// Cinder requires
	deps.push(
		...(sources.cinder?.data.requires ?? []).map((d) => toDependencyLd(d)),
	)

	// publiccode.yml dependencies
	deps.push(
		...(sources.publiccode?.data.dependencies ?? []).map((d) =>
			toDependencyLd(d.name, d.version),
		),
	)

	return deps
}

/**
 * Collect dev dependencies from ecosystem sources.
 */
function collectDevDeps(sources: {
	cargo: ReturnType<typeof firstOf<{ data: { devDependencies: Array<{ name: string; version?: string }> } }>>,
	gem: ReturnType<typeof firstOf<{ data: { dependencies: Array<{ name: string; requirements: string[]; type: 'development' | 'runtime' }> } }>>,
	javaPomXml: MetadataContext['javaPomXml'],
	nodePackageJson: MetadataContext['nodePackageJson'],
	rubyGemspec: MetadataContext['rubyGemspec'],
}): CodemetaDependencyLd[] {
	const deps: CodemetaDependencyLd[] = []

	// Node devDependencies
	deps.push(
		...collectArrayField(sources.nodePackageJson, (d) =>
			objectEntriesToDeps(d.devDependencies),
		),
	)

	// Rust dev-dependencies
	deps.push(
		...(sources.cargo?.data.devDependencies ?? []).map((d) => toDependencyLd(d.name, d.version)),
	)

	// Ruby development dependencies
	deps.push(
		...collectArrayField(sources.rubyGemspec, (d) =>
			d.dependencies
				?.filter((dep: { type: string }) => dep.type === 'development')
				.map((dep: { name: string; requirements: string[] }) =>
					toDependencyLd(dep.name, dep.requirements.join(', ')),
				),
		),
	)

	// Java POM devDependencies
	deps.push(
		...collectArrayField(sources.javaPomXml, (d) =>
			d.devDependencies?.map((dep: { artifactId: string; groupId: string; version?: string }) =>
				toDependencyLd(dep.artifactId, dep.version, `${dep.groupId}:${dep.artifactId}`),
			),
		),
	)

	return deps
}

// ─── Field Helpers ──────────────────────────────────────────────────

/**
 * Convert a Record<name, version> dependency map to CodemetaDependencyLd[].
 */
function objectEntriesToDeps(
	deps: Record<string, string> | undefined,
): CodemetaDependencyLd[] | undefined {
	if (deps === undefined) return undefined
	return Object.entries(deps).map(([depName, depVersion]) => toDependencyLd(depName, depVersion))
}

/**
 * Parse a PEP 508 dependency string ("package>=1.0") into a CodemetaDependencyLd.
 */
function parsePep508Dep(dep: string): CodemetaDependencyLd {
	const match = /^([A-Za-z0-9_.-]+)\s*(.*)$/.exec(dep.trim())
	if (match) {
		const depVersion = match[2].trim()
		return toDependencyLd(match[1], depVersion.length > 0 ? depVersion : undefined)
	}

	return toDependencyLd(dep.trim())
}

/**
 * Extract URL from package.json repository field (string or {url}).
 */
function repositoryUrlFromPackageJson(
	repository: { type: string; url: string } | string | undefined,
): string | undefined {
	if (repository === undefined) return undefined
	if (typeof repository === 'string') return repository
	return repository.url
}

/**
 * Extract URL from package.json bugs field.
 */
function bugsUrlFromPackageJson(
	bugs: { email?: string; url?: string } | { email: string; url?: string } | undefined,
): string | undefined {
	if (bugs === undefined) return undefined
	return bugs.url
}

/**
 * Extract the first license name from a POM record.
 */
function firstPomLicense(
	pom: ReturnType<typeof firstOf<{ data: { licenses: Array<{ name?: string; url?: string }> } }>>,
): string | undefined {
	const pomLicense = pom?.data.licenses[0]
	return pomLicense?.name ?? pomLicense?.url
}

/**
 * Resolve Python pyproject.toml license field to a string.
 * Can be a string (SPDX ID) or `{ spdx?: string; text?: string; file?: string }`.
 */
function resolvePythonLicense(
	pythonLicense: { file?: string; spdx?: string; text?: string } | string | undefined,
): string | undefined {
	if (pythonLicense === undefined) return undefined
	if (typeof pythonLicense === 'string') return pythonLicense
	return pythonLicense.spdx ?? pythonLicense.text
}

/**
 * Resolve codemeta license field (string or string[]) to first string.
 */
function resolveCmLicense(
	cmLicense: string | string[] | undefined,
): string | undefined {
	if (cmLicense === undefined) return undefined
	return Array.isArray(cmLicense) ? cmLicense[0] : cmLicense
}

/**
 * Deduplicate strings case-insensitively, preserving first occurrence casing.
 */
function deduplicateStrings(strings: string[]): string[] {
	const seen = new Map<string, string>()
	for (const s of strings) {
		const key = s.toLowerCase().trim()
		if (key.length > 0 && !seen.has(key)) {
			seen.set(key, s)
		}
	}

	return [...seen.values()]
}

/**
 * Truncate an ISO 8601 date-time to just the date portion (YYYY-MM-DD).
 * CodeMeta dates are `schema:Date`, not `schema:DateTime`.
 */
function toDateOnly(value: string | undefined): string | undefined {
	if (value === undefined) return undefined
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
	const match = /^(\d{4}-\d{2}-\d{2})T/.exec(value)
	if (match) return match[1]
	return value
}

/**
 * Infer a `targetProduct` from available package signals.
 * Only called when `INFER_TARGET_PRODUCT` is enabled.
 */
function inferTargetProduct(
	pkg: ReturnType<typeof firstOf<{ data: { bin?: Record<string, string>; browser?: unknown } }>>,
	obsidian: ReturnType<typeof firstOf<{ data: { id: string } }>>,
): Record<string, string> | undefined {
	if (obsidian !== undefined) {
		return { '@type': 'DesktopApplication' }
	}

	if (pkg?.data.bin !== undefined && Object.keys(pkg.data.bin).length > 0) {
		return { '@type': 'CommandLineApplication' }
	}

	if (pkg?.data.browser !== undefined) {
		return { '@type': 'WebApplication' }
	}

	return undefined
}

/**
 * Build a URL for the project's README.
 * Prefers a web URL on the remote service (e.g. GitHub blob link) when a
 * code repository URL is available, otherwise falls back to the local source path.
 */
function readmeUrl(
	readmeRecord: ReturnType<typeof firstOf<{ source: string }>>,
	repoUrl: string | undefined,
	defaultBranch: string | undefined,
): string | undefined {
	if (readmeRecord === undefined) return undefined
	const filename = readmeRecord.source

	// Build a web URL if we have a GitHub-style repo URL
	if (is.nonEmptyStringAndNotWhitespace(repoUrl) && repoUrl.includes('github.com')) {
		const branch = defaultBranch ?? 'main'
		const base = repoUrl.replace(/\.git$/, '')
		return `${base}/blob/${branch}/${filename}`
	}

	// Fall back to the source path
	return filename
}
