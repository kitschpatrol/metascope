/* eslint-disable unicorn/no-immediate-mutation */
/* eslint-disable unicorn/prefer-single-call */
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
 * license, dependencies, keywords, …) the ecosystem manifest is canonical. This
 * keeps the output fresh when e.g. a new dependency is added to package.json,
 * and makes the round-trip stable: generate → save as codemeta.json →
 * regenerate → identical output.
 *
 * For **codemeta-specific fields** that only exist in codemeta.json
 * (developmentStatus, funding, buildInstructions, …) the existing codemeta.json
 * is the source of truth.
 *
 * ## Software type inference
 *
 * Set `INFER_TARGET_PRODUCT` to `true` to enable heuristic inference of
 * `targetProduct` from available signals (bin field, browser field, etc.).
 */

import is from '@sindresorhus/is'
import { basename, relative } from 'node:path'
import type { MetadataContext } from '../metadata-types'
import type { CodemetaDependencyLd, CodemetaPersonOrOrgLd } from '../utilities/codemeta-helpers'
import { defineTemplate } from '../metadata-types'
import {
	deduplicateDependencies,
	deduplicatePersonsOrOrgs,
	isProprietaryLicenseSentinel,
	toDependencyLd,
	toPersonOrOrgLd,
	toSpdxLicenseUrl,
} from '../utilities/codemeta-helpers'
import {
	collectArrayField,
	collectField,
	firstOf,
	nonEmpty,
	stripUndefined,
} from '../utilities/template-helpers'

// ─── Feature flags ──────────────────────────────────────────────────

/**
 * Enable heuristic inference of `targetProduct` based on available signals.
 * When false, `targetProduct` is omitted from the output.
 */
const INFER_TARGET_PRODUCT = false as const

const PEP508_NAME_REGEX = /^[\w.\-]+/v
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/v
const DATETIME_DATE_REGEX = /^(\d{4}-\d{2}-\d{2})T/v
const TRAILING_DOT_GIT_REGEX = /\.git$/v

// ─── Template ───────────────────────────────────────────────────────

export type TemplateDataCodemeta = ReturnType<typeof codemeta>

export const codemeta = defineTemplate(
	({
		arduinoLibraryProperties,
		cinderCinderblockXml,
		codemetaJson: codemetaRaw,
		codeStats,
		fileStats,
		github: githubRaw,
		gitStats: gitRaw,
		goGoMod,
		javaPomXml,
		licenseFile,
		metascope,
		nodeNpmRegistry: npmRaw,
		nodePackageJson,
		obsidianPluginManifestJson,
		openframeworksAddonConfigMk,
		openframeworksInstallXml,
		processingLibraryProperties,
		publiccodeYaml,
		pythonPkgInfo,
		pythonPypiRegistry: pypiRaw,
		pythonPyprojectToml,
		pythonSetupCfg,
		pythonSetupPy,
		readmeFile,
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
		const package_ = firstOf(nodePackageJson)
		const pyproject = firstOf(pythonPyprojectToml)
		const setupPy = firstOf(pythonSetupPy)
		const setupConfig = firstOf(pythonSetupCfg)
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
		const loc = firstOf(codeStats)
		const readmeFileFirst = firstOf(readmeFile)
		const fileStatsFirst = firstOf(fileStats)

		// ── Identity ────────────────────────────────────────────────

		const poetry = pyproject?.data.tool?.poetry

		const name =
			package_?.data.name ??
			pyproject?.data.project?.name ??
			poetry?.name ??
			setupPy?.data.name ??
			setupConfig?.data.name ??
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
			cm?.data.name ??
			readmeFileFirst?.data.name ??
			fileStatsFirst?.data.folderName

		const description =
			package_?.data.description ??
			pyproject?.data.project?.description ??
			poetry?.description ??
			setupPy?.data.description ??
			setupConfig?.data.description ??
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
			package_?.data.version ??
			pyproject?.data.project?.version ??
			poetry?.version ??
			setupPy?.data.version ??
			setupConfig?.data.version ??
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
			package_?.data.name ?? // Also has identifier value, but that has the version suffix
			cm?.data.identifier

		// ── Author ──────────────────────────────────────────────────

		const ecosystemAuthors: Array<CodemetaPersonOrOrgLd | undefined> = [
			// Node package.json
			...(package_?.data.author
				? [
						toPersonOrOrgLd({
							email: package_.data.author.email,
							name: package_.data.author.name,
							url: package_.data.author.url,
						}),
					]
				: []),

			// Python pyproject.toml
			...(pyproject?.data.project?.authors ?? []).map((a) =>
				toPersonOrOrgLd(is.plainObject(a) ? { email: a.email, name: a.name } : { name: a }),
			),

			// Python setup.py / setup.cfg
			...(setupPy?.data.author !== undefined && setupPy.data.author !== ''
				? [toPersonOrOrgLd({ email: setupPy.data.author_email, name: setupPy.data.author })]
				: []),
			...(setupConfig?.data.author !== undefined && setupConfig.data.author !== ''
				? [toPersonOrOrgLd({ email: setupConfig.data.author_email, name: setupConfig.data.author })]
				: []),

			// Rust Cargo.toml
			...(cargo?.data.authors ?? []).map((a) => toPersonOrOrgLd({ email: a.email, name: a.name })),

			// Ruby gemspec (authors + email paired by index)
			...gemspecAuthors(gem),

			// Java POM developers
			...(pom?.data.developers ?? []).map((d) =>
				toPersonOrOrgLd({ affiliation: d.organization, email: d.email, name: d.name, url: d.url }),
			),

			// Arduino
			...(arduino?.data.authors ?? []).map((a) =>
				toPersonOrOrgLd({ email: a.email, name: a.name }),
			),

			// Processing
			...(processing?.data.authors ?? []).map((a) => toPersonOrOrgLd({ name: a.name, url: a.url })),

			// OpenFrameworks
			...(ofAddon?.data.author !== undefined && ofAddon.data.author !== ''
				? [toPersonOrOrgLd({ name: ofAddon.data.author })]
				: []),
			...(ofInstall?.data.author !== undefined && ofInstall.data.author !== ''
				? [toPersonOrOrgLd({ name: ofInstall.data.author })]
				: []),

			// Cinder
			...(cinder?.data.author ?? []).map((a) => toPersonOrOrgLd({ name: a })),

			// Xcode
			...(xcode?.data.author !== undefined && xcode.data.author !== ''
				? [toPersonOrOrgLd({ email: xcode.data.authorEmail, name: xcode.data.author })]
				: []),

			// Obsidian
			...(obsidian?.data.author !== undefined && obsidian.data.author !== ''
				? [toPersonOrOrgLd({ name: obsidian.data.author, url: obsidian.data.authorUrl })]
				: []),

			// Publiccode.yml contacts
			...(publiccode?.data.contacts ?? []).map((c) =>
				toPersonOrOrgLd({ affiliation: c.affiliation, email: c.email, name: c.name }),
			),
		]

		const cmAuthors = cm?.data.author?.map((p) =>
			toPersonOrOrgLd({
				affiliation: p.affiliation,
				email: p.email,
				familyName: p.familyName,
				givenName: p.givenName,
				id: p.id,
				name: p.name,
				type: p.type,
				url: p.url,
			}),
		)

		const author = resolvePersonsOrOrgs(ecosystemAuthors, cmAuthors)

		// ── Contributor ─────────────────────────────────────────────

		const ecosystemContributors: Array<CodemetaPersonOrOrgLd | undefined> = [
			// Node package.json contributors
			...collectArrayField(nodePackageJson, (d) =>
				d.contributors?.map((c) =>
					toPersonOrOrgLd(
						is.plainObject(c) ? { email: c.email, name: c.name, url: c.url } : { name: c },
					),
				),
			),

			// Java POM contributors
			...(pom?.data.contributors ?? []).map((c) =>
				toPersonOrOrgLd({ affiliation: c.organization, email: c.email, name: c.name, url: c.url }),
			),
		]

		const cmContributors = cm?.data.contributor?.map((p) =>
			toPersonOrOrgLd({
				affiliation: p.affiliation,
				email: p.email,
				familyName: p.familyName,
				givenName: p.givenName,
				id: p.id,
				name: p.name,
				type: p.type,
				url: p.url,
			}),
		)

		const contributor = resolvePersonsOrOrgs(ecosystemContributors, cmContributors)

		// ── Maintainer ──────────────────────────────────────────────

		const ecosystemMaintainers: Array<CodemetaPersonOrOrgLd | undefined> = [
			// Node package.json maintainers
			...collectArrayField(nodePackageJson, (d) =>
				d.maintainers?.map((c) =>
					toPersonOrOrgLd(
						is.plainObject(c) ? { email: c.email, name: c.name, url: c.url } : { name: c },
					),
				),
			),
			...(pyproject?.data.project?.maintainers ?? []).map((m) =>
				toPersonOrOrgLd(is.plainObject(m) ? { email: m.email, name: m.name } : { name: m }),
			),
			...(setupPy?.data.maintainer !== undefined && setupPy.data.maintainer !== ''
				? [toPersonOrOrgLd({ email: setupPy.data.maintainer_email, name: setupPy.data.maintainer })]
				: []),
			...(setupConfig?.data.maintainer !== undefined && setupConfig.data.maintainer !== ''
				? [
						toPersonOrOrgLd({
							email: setupConfig.data.maintainer_email,
							name: setupConfig.data.maintainer,
						}),
					]
				: []),
			...(pkgInfo?.data.maintainer !== undefined && pkgInfo.data.maintainer !== ''
				? [toPersonOrOrgLd({ email: pkgInfo.data.maintainer_email, name: pkgInfo.data.maintainer })]
				: []),
			...(arduino?.data.maintainer
				? [
						toPersonOrOrgLd({
							email: arduino.data.maintainer.email,
							name: arduino.data.maintainer.name,
						}),
					]
				: []),
		]

		const cmMaintainers = cm?.data.maintainer?.map((p) =>
			toPersonOrOrgLd({
				affiliation: p.affiliation,
				email: p.email,
				familyName: p.familyName,
				givenName: p.givenName,
				id: p.id,
				name: p.name,
				type: p.type,
				url: p.url,
			}),
		)

		const maintainer = resolvePersonsOrOrgs(ecosystemMaintainers, cmMaintainers)

		// ── Copyright holder ────────────────────────────────────────

		const ecosystemCopyrightHolders: Array<CodemetaPersonOrOrgLd | undefined> = [
			...(publiccode?.data.mainCopyrightOwner !== undefined &&
			publiccode.data.mainCopyrightOwner !== ''
				? [toPersonOrOrgLd({ name: publiccode.data.mainCopyrightOwner })]
				: []),
			...(xcode?.data.copyrightHolder !== undefined && xcode.data.copyrightHolder !== ''
				? [toPersonOrOrgLd({ name: xcode.data.copyrightHolder })]
				: []),
		]

		const cmCopyrightHolders = cm?.data.copyrightHolder?.map((p) =>
			toPersonOrOrgLd({
				affiliation: p.affiliation,
				email: p.email,
				familyName: p.familyName,
				givenName: p.givenName,
				id: p.id,
				name: p.name,
				type: p.type,
				url: p.url,
			}),
		)

		const copyrightHolder = resolvePersonsOrOrgs(ecosystemCopyrightHolders, cmCopyrightHolders)

		// ── Funder ──────────────────────────────────────────────────

		const funder = resolvePersonsOrOrgs(
			[],
			cm?.data.funder?.map((p) =>
				toPersonOrOrgLd({
					affiliation: p.affiliation,
					email: p.email,
					familyName: p.familyName,
					givenName: p.givenName,
					id: p.id,
					name: p.name,
					type: p.type,
					url: p.url,
				}),
			),
		)

		// ── Code ────────────────────────────────────────────────────

		const codeRepo =
			github?.data.url ??
			cargo?.data.repository ??
			pom?.data.scmUrl ??
			goMod?.data.repository_url ??
			publiccode?.data.url ??
			arduino?.data.repository ??
			cinder?.data.git ??
			cm?.data.codeRepository ??
			repoUrlFromPackageJson(package_?.data.repository) ??
			caseInsensitiveLookup(pyproject?.data.project?.urls, 'repository') ??
			poetry?.repository

		const programmingLanguage =
			nonEmpty([
				...(github?.data.primaryLanguage !== undefined && github.data.primaryLanguage !== ''
					? [github.data.primaryLanguage]
					: []),
				...(cm?.data.programmingLanguage ?? []),
			]) ??
			nonEmpty(Object.keys(github?.data.languages ?? {})) ??
			loc?.data.total?.languages.slice(0, 1)

		const runtimePlatform = nonEmpty([
			...Object.keys(package_?.data.engines ?? {}),
			...(goMod?.data.go_version !== undefined && goMod.data.go_version !== ''
				? [`go ${goMod.data.go_version}`]
				: []),
			...(cargo?.data.rustVersion !== undefined && cargo.data.rustVersion !== ''
				? [`rust ${cargo.data.rustVersion}`]
				: []),
			...(pyproject?.data.project?.requiresPython !== undefined &&
			pyproject.data.project.requiresPython !== ''
				? [`python ${pyproject.data.project.requiresPython}`]
				: []),
			...(setupPy?.data.python_requires !== undefined && setupPy.data.python_requires !== ''
				? [`python ${setupPy.data.python_requires}`]
				: []),
			...(gem?.data.required_ruby_version !== undefined && gem.data.required_ruby_version !== ''
				? [`ruby ${gem.data.required_ruby_version}`]
				: []),
			...(pom?.data.javaVersion !== undefined && pom.data.javaVersion !== ''
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

		const appCategory =
			cm?.data.applicationCategory ??
			xcode?.data.applicationCategory ??
			arduino?.data.category ??
			publiccode?.data.softwareType

		const appSubCategory = cm?.data.applicationSubCategory

		// ── Dependencies ────────────────────────────────────────────

		const runtimeDependencies = collectRuntimeDependencies({
			arduino,
			cargo,
			cinder,
			gem,
			goGoMod,
			javaPomXml,
			nodePackageJson,
			ofAddon,
			ofInstall,
			pkgInfo,
			publiccode,
			pyproject,
			rubyGemspec,
			setupCfg: setupConfig,
			setupPy,
		})

		const softwareRequirements =
			runtimeDependencies.length > 0
				? deduplicateDependencies(runtimeDependencies)
				: cm?.data.softwareRequirements?.map((d) =>
						toDependencyLd(
							d.name ?? d.identifier ?? '',
							d.version,
							d.identifier,
							d.runtimePlatform,
						),
					)

		const developmentDependencies = collectDevelopmentDependencies({
			cargo,
			gem,
			javaPomXml,
			nodePackageJson,
			rubyGemspec,
		})

		const softwareSuggestions =
			developmentDependencies.length > 0
				? deduplicateDependencies(developmentDependencies)
				: cm?.data.softwareSuggestions?.map((d) =>
						toDependencyLd(
							d.name ?? d.identifier ?? '',
							d.version,
							d.identifier,
							d.runtimePlatform,
						),
					)

		// ── Dates ───────────────────────────────────────────────────

		const dateCreated = git?.data.commitDateFirst ?? github?.data.createdAt ?? cm?.data.dateCreated

		const dateModified = git?.data.commitDateLast ?? github?.data.pushedAt ?? cm?.data.dateModified

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
			(cm?.data.copyrightYear === undefined ? undefined : String(cm.data.copyrightYear))

		// ── License ─────────────────────────────────────────────────

		const rawLicense =
			package_?.data.license ??
			cargo?.data.license ??
			resolvePythonLicense(pyproject?.data.project?.license) ??
			setupPy?.data.license ??
			setupConfig?.data.license ??
			gem?.data.license ??
			firstPomLicense(pom) ??
			arduino?.data.license ??
			cinder?.data.license ??
			publiccode?.data.license ??
			github?.data.licenseSpdxId ??
			collectField(licenseFile, (d) => d.match?.spdxId)[0] ??
			resolveCmLicense(cm?.data.license)

		const license = is.nonEmptyStringAndNotWhitespace(rawLicense)
			? isProprietaryLicenseSentinel(rawLicense)
				? rawLicense
				: toSpdxLicenseUrl(rawLicense)
			: undefined

		const isAccessibleForFree =
			cm?.data.isAccessibleForFree ?? (github?.data.isPrivate === false ? true : undefined)

		// ── Keywords ────────────────────────────────────────────────

		const keywords = nonEmpty(
			deduplicateStrings([
				...(package_?.data.keywords ?? []),
				...(pyproject?.data.project?.keywords ?? []),
				...(poetry?.keywords ?? []),
				...(setupPy?.data.keywords ?? []),
				...(setupConfig?.data.keywords ?? []),
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
			stripReadmeFragment(package_?.data.homepage) ??
			caseInsensitiveLookup(pyproject?.data.project?.urls, 'homepage') ??
			poetry?.homepage ??
			cargo?.data.homepage ??
			setupPy?.data.url ??
			setupConfig?.data.url ??
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
			cm?.data.url ??
			caseInsensitiveLookup(pyproject?.data.project?.urls, 'repository') ??
			poetry?.repository

		const downloadUrl =
			ofInstall?.data.downloadUrl ??
			processing?.data.download ??
			npm?.data.url ??
			pypi?.data.url ??
			cm?.data.downloadUrl

		const issueTracker =
			bugsUrlFromPackageJson(package_?.data.bugs) ??
			pom?.data.issueManagementUrl ??
			cm?.data.issueTracker ??
			(github?.data.hasIssuesEnabled ? `${github.data.url}/issues` : undefined)

		const continuousIntegration = pom?.data.ciManagementUrl ?? cm?.data.continuousIntegration

		const softwareHelp = cargo?.data.documentation ?? cm?.data.softwareHelp

		// ── Codemeta-specific (preserved from existing codemeta.json) ───

		const developmentStatus = publiccode?.data.developmentStatus ?? cm?.data.developmentStatus

		const funding = cm?.data.funding
		const buildInstructions = cm?.data.buildInstructions
		const readme =
			readmeUrl(
				firstOf(readmeFile),
				codeRepo,
				github?.data.defaultBranch ?? git?.data.branchCurrent,
				firstOf(metascope)?.data.options.path,
			) ?? cm?.data.readme
		const releaseNotes = cm?.data.releaseNotes
		const installUrl = cm?.data.installUrl
		const relatedLink = cm?.data.relatedLink

		// ── Software type inference ────────────────────────────────

		// eslint-disable-next-line ts/no-unnecessary-condition
		const targetProduct = INFER_TARGET_PRODUCT ? inferTargetProduct(package_, obsidian) : undefined

		// ── Build the JSON-LD object ────────────────────────────────

		return stripUndefined({
			'@context': 'https://w3id.org/codemeta/3.0',
			'@type': 'SoftwareSourceCode',
			// Application
			applicationCategory: appCategory,
			applicationSubCategory: appSubCategory,
			// People
			author,
			buildInstructions,
			// Source code
			codeRepository: codeRepo,
			continuousIntegration,
			contributor,
			copyrightHolder,
			copyrightYear: toCopyrightYear(copyrightYear),
			// Dates
			dateCreated: toDateOnly(dateCreated),
			dateModified: toDateOnly(dateModified),
			datePublished: toDateOnly(datePublished),
			description,
			// Development
			developmentStatus,
			downloadUrl,
			funder,
			funding,
			identifier,
			installUrl,
			isAccessibleForFree,
			issueTracker,
			// Keywords
			keywords,
			// License
			license,
			maintainer,
			// Identity
			name,
			operatingSystem,
			programmingLanguage,
			readme,
			relatedLink,
			releaseNotes,
			runtimePlatform,
			softwareHelp,
			// Dependencies
			softwareRequirements,
			softwareSuggestions,
			// Software type
			targetProduct,
			// URLs
			url,
			version,
		})
	},
)

// ─── Person Helpers ─────────────────────────────────────────────────

/**
 * Extract authors from a gemspec record. Gemspec has `authors: string[]` and a
 * separate `email: string | string[]`. We pair them by index where possible.
 */
function gemspecAuthors(
	gem: ReturnType<typeof firstOf<{ data: { authors: string[]; email?: string | string[] } }>>,
): Array<CodemetaPersonOrOrgLd | undefined> {
	if (gem === undefined) {
		return []
	}

	const emails =
		gem.data.email === undefined
			? []
			: Array.isArray(gem.data.email)
				? gem.data.email
				: [gem.data.email]

	return gem.data.authors.map((authorName, index) =>
		toPersonOrOrgLd({ email: emails[index], name: authorName }),
	)
}

/**
 * Takes ecosystem persons (which may include undefined) and codemeta fallback
 * persons. Uses ecosystem if any are present, otherwise falls back. Always
 * deduplicates by name.
 */
function resolvePersonsOrOrgs(
	ecosystemPersons: Array<CodemetaPersonOrOrgLd | undefined>,
	fallbackPersons?: Array<CodemetaPersonOrOrgLd | undefined>,
): CodemetaPersonOrOrgLd[] | undefined {
	const ecosystem = ecosystemPersons.filter((p): p is CodemetaPersonOrOrgLd => p !== undefined)

	if (ecosystem.length > 0) {
		return deduplicatePersonsOrOrgs(ecosystem)
	}

	const fallback = (fallbackPersons ?? []).filter(
		(p): p is CodemetaPersonOrOrgLd => p !== undefined,
	)

	return deduplicatePersonsOrOrgs(fallback)
}

// ─── Dependency Helpers ─────────────────────────────────────────────

/**
 * Collect runtime dependencies from all ecosystem sources.
 */
function collectRuntimeDependencies(sources: {
	arduino: ReturnType<
		typeof firstOf<{ data: { depends: Array<{ name: string; versionConstraint?: string }> } }>
	>
	cargo: ReturnType<
		typeof firstOf<{ data: { dependencies: Array<{ name: string; version?: string }> } }>
	>
	cinder: ReturnType<typeof firstOf<{ data: { requires: string[] } }>>
	gem: ReturnType<
		typeof firstOf<{
			data: {
				dependencies: Array<{
					name: string
					requirements: string[]
					type: 'development' | 'runtime'
				}>
			}
		}>
	>
	goGoMod: MetadataContext['goGoMod']
	javaPomXml: MetadataContext['javaPomXml']
	nodePackageJson: MetadataContext['nodePackageJson']
	ofAddon: ReturnType<typeof firstOf<{ data: { dependencies: string[] } }>>
	ofInstall: ReturnType<typeof firstOf<{ data: { requirements: string[] } }>>
	pkgInfo: ReturnType<typeof firstOf<{ data: { requires_dist: string[] } }>>
	publiccode: ReturnType<
		typeof firstOf<{ data: { dependencies: Array<{ name: string; version?: string }> } }>
	>
	pyproject: ReturnType<typeof firstOf<{ data: { project?: { dependencies?: string[] } } }>>
	rubyGemspec: MetadataContext['rubyGemspec']
	setupCfg: ReturnType<typeof firstOf<{ data: { install_requires: string[] } }>>
	setupPy: ReturnType<typeof firstOf<{ data: { install_requires: string[] } }>>
}): CodemetaDependencyLd[] {
	const dependencies: CodemetaDependencyLd[] = []

	// Node package.json dependencies
	dependencies.push(
		...collectArrayField(sources.nodePackageJson, (d) =>
			objectEntriesToDependencies(d.dependencies),
		),
	)

	// Python pyproject.toml dependencies
	dependencies.push(
		...(sources.pyproject?.data.project?.dependencies ?? []).map((dependency) =>
			parsePep508Dependency(dependency),
		),
	)

	// Python setup.py / setup.cfg install_requires
	dependencies.push(
		...(sources.setupPy?.data.install_requires ?? []).map((dependency) =>
			parsePep508Dependency(dependency),
		),
	)
	dependencies.push(
		...(sources.setupCfg?.data.install_requires ?? []).map((dependency) =>
			parsePep508Dependency(dependency),
		),
	)

	// Python PKG-INFO requires_dist
	dependencies.push(
		...(sources.pkgInfo?.data.requires_dist ?? []).map((dependency) =>
			parsePep508Dependency(dependency),
		),
	)

	// Rust Cargo.toml dependencies
	dependencies.push(
		...(sources.cargo?.data.dependencies ?? []).map((d) => toDependencyLd(d.name, d.version)),
	)

	// Ruby gemspec runtime dependencies
	dependencies.push(
		...collectArrayField(sources.rubyGemspec, (d) =>
			d.dependencies
				.filter((dependency: { type: string }) => dependency.type === 'runtime')
				.map((dependency: { name: string; requirements: string[] }) =>
					toDependencyLd(dependency.name, dependency.requirements.join(', ')),
				),
		),
	)

	// Java POM dependencies
	dependencies.push(
		...collectArrayField(sources.javaPomXml, (d) =>
			d.dependencies.map((dependency: { artifactId: string; groupId: string; version?: string }) =>
				toDependencyLd(
					dependency.artifactId,
					dependency.version,
					`${dependency.groupId}:${dependency.artifactId}`,
				),
			),
		),
	)

	// Go go.mod dependencies
	dependencies.push(
		...collectArrayField(sources.goGoMod, (d) =>
			d.dependencies.map((dependency: { module: string; version: string }) =>
				toDependencyLd(dependency.module, dependency.version),
			),
		),
	)

	// Arduino depends
	dependencies.push(
		...(sources.arduino?.data.depends ?? []).map((d) =>
			toDependencyLd(d.name, d.versionConstraint),
		),
	)

	// OpenFrameworks
	dependencies.push(...(sources.ofAddon?.data.dependencies ?? []).map((d) => toDependencyLd(d)))
	dependencies.push(...(sources.ofInstall?.data.requirements ?? []).map((d) => toDependencyLd(d)))

	// Cinder requires
	dependencies.push(...(sources.cinder?.data.requires ?? []).map((d) => toDependencyLd(d)))

	// Publiccode.yml dependencies
	dependencies.push(
		...(sources.publiccode?.data.dependencies ?? []).map((d) => toDependencyLd(d.name, d.version)),
	)

	return dependencies
}

/**
 * Collect dev dependencies from ecosystem sources.
 */
function collectDevelopmentDependencies(sources: {
	cargo: ReturnType<
		typeof firstOf<{ data: { devDependencies: Array<{ name: string; version?: string }> } }>
	>
	gem: ReturnType<
		typeof firstOf<{
			data: {
				dependencies: Array<{
					name: string
					requirements: string[]
					type: 'development' | 'runtime'
				}>
			}
		}>
	>
	javaPomXml: MetadataContext['javaPomXml']
	nodePackageJson: MetadataContext['nodePackageJson']
	rubyGemspec: MetadataContext['rubyGemspec']
}): CodemetaDependencyLd[] {
	const dependencies: CodemetaDependencyLd[] = []

	// Node devDependencies
	dependencies.push(
		...collectArrayField(sources.nodePackageJson, (d) =>
			objectEntriesToDependencies(d.devDependencies),
		),
	)

	// Rust dev-dependencies
	dependencies.push(
		...(sources.cargo?.data.devDependencies ?? []).map((d) => toDependencyLd(d.name, d.version)),
	)

	// Ruby development dependencies
	dependencies.push(
		...collectArrayField(sources.rubyGemspec, (d) =>
			d.dependencies
				.filter((dependency: { type: string }) => dependency.type === 'development')
				.map((dependency: { name: string; requirements: string[] }) =>
					toDependencyLd(dependency.name, dependency.requirements.join(', ')),
				),
		),
	)

	// Java POM devDependencies
	dependencies.push(
		...collectArrayField(sources.javaPomXml, (d) =>
			d.devDependencies.map(
				(dependency: { artifactId: string; groupId: string; version?: string }) =>
					toDependencyLd(
						dependency.artifactId,
						dependency.version,
						`${dependency.groupId}:${dependency.artifactId}`,
					),
			),
		),
	)

	return dependencies
}

// ─── Field Helpers ──────────────────────────────────────────────────

/**
 * Convert a Record<name, version> dependency map to CodemetaDependencyLd[].
 */
function objectEntriesToDependencies(
	dependencies: Record<string, string> | undefined,
): CodemetaDependencyLd[] | undefined {
	if (dependencies === undefined) {
		return undefined
	}

	return Object.entries(dependencies).map(([dependencyName, dependencyVersion]) =>
		toDependencyLd(dependencyName, dependencyVersion),
	)
}

/**
 * Parse a PEP 508 dependency string ("package>=1.0") into a
 * CodemetaDependencyLd.
 */
function parsePep508Dependency(dependency: string): CodemetaDependencyLd {
	const trimmed = dependency.trim()
	const nameMatch = PEP508_NAME_REGEX.exec(trimmed)
	if (nameMatch) {
		const dependencyVersion = trimmed.slice(nameMatch[0].length).trim()
		return toDependencyLd(
			nameMatch[0],
			dependencyVersion.length > 0 ? dependencyVersion : undefined,
		)
	}

	return toDependencyLd(trimmed)
}

/**
 * Extract URL from package.json repository field (string or {url}).
 */
function repoUrlFromPackageJson(
	repo: string | undefined | { type: string; url: string },
): string | undefined {
	if (repo === undefined) {
		return undefined
	}

	if (typeof repo === 'string') {
		return repo
	}

	return repo.url
}

/**
 * Extract URL from package.json bugs field.
 */
function bugsUrlFromPackageJson(
	bugs: undefined | { email: string; url?: string } | { email?: string; url?: string },
): string | undefined {
	if (bugs === undefined) {
		return undefined
	}

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
 * Resolve Python pyproject.toml license field to a string. Can be a string
 * (SPDX ID) or `{ spdx?: string; text?: string; file?: string }`.
 */
function resolvePythonLicense(
	pythonLicense: string | undefined | { file?: string; spdx?: string; text?: string },
): string | undefined {
	if (pythonLicense === undefined) {
		return undefined
	}

	if (typeof pythonLicense === 'string') {
		return pythonLicense
	}

	return pythonLicense.spdx ?? pythonLicense.text
}

/**
 * Resolve codemeta license field (string or string[]) to first string.
 */
function resolveCmLicense(cmLicense: string | string[] | undefined): string | undefined {
	if (cmLicense === undefined) {
		return undefined
	}

	return Array.isArray(cmLicense) ? cmLicense[0] : cmLicense
}

/**
 * Parse a copyright year string to a leading integer year, or undefined when it
 * contains no parseable year (0 and NaN both collapse to undefined).
 */
function toCopyrightYear(copyrightYear: string | undefined): number | undefined {
	if (!is.nonEmptyStringAndNotWhitespace(copyrightYear)) {
		return undefined
	}

	// Prefix-parse a leading year (e.g. "2020-2021" → 2020); Number() would reject these.
	// eslint-disable-next-line unicorn/prefer-number-coercion
	const year = Number.parseInt(copyrightYear, 10)
	return year === 0 || Number.isNaN(year) ? undefined : year
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

	return seen.values().toArray()
}

/**
 * Case-insensitive lookup in a string record (e.g. pyproject.toml
 * `[project.urls]`).
 */
function caseInsensitiveLookup(
	record: Record<string, string> | undefined,
	key: string,
): string | undefined {
	if (record === undefined) {
		return undefined
	}

	const lowerKey = key.toLowerCase()
	for (const [k, v] of Object.entries(record)) {
		if (k.toLowerCase() === lowerKey) {
			return v
		}
	}

	return undefined
}

/**
 * Strip the `#readme` fragment that npm's normalize-package-data appends to
 * homepage URLs derived from repository URLs.
 */
function stripReadmeFragment(url: string | undefined): string | undefined {
	if (url === undefined) {
		return undefined
	}

	return url.endsWith('#readme') ? url.slice(0, -7) : url
}

/**
 * Truncate an ISO 8601 date-time to just the date portion (YYYY-MM-DD).
 * CodeMeta dates are `schema:Date`, not `schema:DateTime`.
 */
function toDateOnly(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined
	}

	if (DATE_ONLY_REGEX.test(value)) {
		return value
	}

	const match = DATETIME_DATE_REGEX.exec(value)
	if (match) {
		return match[1]
	}

	return value
}

/**
 * Infer a `targetProduct` from available package signals. Only called when
 * `INFER_TARGET_PRODUCT` is enabled.
 */
function inferTargetProduct(
	package_: ReturnType<
		typeof firstOf<{ data: { bin?: Record<string, string>; browser?: unknown } }>
	>,
	obsidian: ReturnType<typeof firstOf<{ data: { id: string } }>>,
): Record<string, string> | undefined {
	if (obsidian !== undefined) {
		return { '@type': 'DesktopApplication' }
	}

	if (package_?.data.bin !== undefined && Object.keys(package_.data.bin).length > 0) {
		return { '@type': 'CommandLineApplication' }
	}

	if (package_?.data.browser !== undefined) {
		return { '@type': 'WebApplication' }
	}

	return undefined
}

/**
 * Build a URL for the project's README. Prefers a web URL on the remote service
 * (e.g. GitHub blob link) when a code repository URL is available, otherwise
 * falls back to the local source path.
 */
function readmeUrl(
	readmeRecord: ReturnType<typeof firstOf<{ source: string }>>,
	repoUrl: string | undefined,
	defaultBranch: string | undefined,
	basePath: string | undefined,
): string | undefined {
	if (readmeRecord === undefined) {
		return undefined
	}

	const repoRelativePath =
		basePath === undefined
			? basename(readmeRecord.source)
			: relative(basePath, readmeRecord.source).replaceAll('\\', '/')

	// Build a web URL if we have a GitHub-style repo URL
	if (is.nonEmptyStringAndNotWhitespace(repoUrl) && repoUrl.includes('github.com')) {
		const branch = defaultBranch ?? 'main'
		const base = repoUrl.replace(TRAILING_DOT_GIT_REGEX, '')
		return `${base}/blob/${branch}/${repoRelativePath}`
	}

	// Fall back to the repo-relative path
	return repoRelativePath
}
