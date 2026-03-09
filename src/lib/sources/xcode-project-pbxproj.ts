// CSpell:words pbxproj xcodeproj SDKROOT iphoneos macosx appletvos watchos xros TVOS INFOPLIST ORGANIZATIONNAME

/**
 * Source and parser for Xcode `.pbxproj` project files.
 *
 * Uses the `@bacons/xcode` package to parse the binary/ASCII plist format
 * and navigate the Xcode project object graph.
 *
 * Extracts metadata from:
 *   - Project-level attributes (organizationName)
 *   - Build settings on the main app target (Release config preferred)
 *   - Swift Package Manager dependencies
 */

import { PBXNativeTarget, XcodeProject, XCRemoteSwiftPackageReference } from '@bacons/xcode'
import is from '@sindresorhus/is'
import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { MetadataSource, SourceContext, SourceRecord } from './source'
import { log } from '../log'
import { nonEmptyString, stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

const pbxprojDependencySchema = z.object({
	url: z.string(),
})

const pbxprojSchema = z.object({
	/** Copyright holder name. */
	copyrightHolder: nonEmptyString,
	/** Copyright year. */
	copyrightYear: nonEmptyString,
	/** Swift Package Manager dependencies. */
	dependencies: z.array(pbxprojDependencySchema),
	/** Bundle identifier (e.g. "com.example.app"). */
	identifier: nonEmptyString,
	/** Display name of the app or target. */
	name: nonEmptyString,
	/** Inferred operating systems with deployment targets. */
	operatingSystems: stringArray,
	/** Organization name from project attributes. */
	organizationName: nonEmptyString,
	/** Detected programming language (Swift or Objective-C). */
	programmingLanguage: nonEmptyString,
	/** Marketing version string. */
	version: nonEmptyString,
})

export type Pbxproj = z.infer<typeof pbxprojSchema>

export type XcodeProjectPbxprojData = SourceRecord<Pbxproj> | undefined

type PbxprojDependency = Pbxproj['dependencies'][number]

// ─── Constants ──────────────────────────────────────────────────────

/** Xcode build variable pattern: $(VAR) or ${VAR}. */
const XCODE_VARIABLE_RE = /\$[({][^)}]+[)}]/

/**
 * Map SDKROOT values to human-readable OS names.
 */
const SDKROOT_MAP: Record<string, string> = {
	appletvos: 'tvOS',
	iphoneos: 'iOS',
	macosx: 'macOS',
	watchos: 'watchOS',
	xros: 'visionOS',
}

/**
 * Deployment target build setting keys and their OS label.
 */
const DEPLOYMENT_TARGETS: Array<{ key: string; os: string }> = [
	{ key: 'IPHONEOS_DEPLOYMENT_TARGET', os: 'iOS' },
	{ key: 'MACOSX_DEPLOYMENT_TARGET', os: 'macOS' },
	{ key: 'TVOS_DEPLOYMENT_TARGET', os: 'tvOS' },
	{ key: 'WATCHOS_DEPLOYMENT_TARGET', os: 'watchOS' },
	{ key: 'XROS_DEPLOYMENT_TARGET', os: 'visionOS' },
]

// ─── Core parser ────────────────────────────────────────────────────

/**
 * Parse a `.pbxproj` file into a structured object.
 * Returns undefined if the file is malformed or cannot be parsed.
 */
export function parse(filePath: string): Pbxproj | undefined {
	let project: InstanceType<typeof XcodeProject>
	try {
		project = XcodeProject.open(filePath)
	} catch {
		return undefined
	}

	const root = project.rootObject

	// Find the best target: prefer main app target, then first native target
	const target = root.props.targets.find((t) => PBXNativeTarget.is(t))

	let appTarget: InstanceType<typeof PBXNativeTarget> | undefined
	try {
		appTarget = root.getMainAppTarget() ?? undefined
	} catch {
		// The getMainAppTarget throws when no app target exists (e.g. framework-only projects)
	}

	appTarget ??= target

	// Get build settings from target and project level (Release config preferred)
	let targetConfig: undefined | { resolveBuildSetting(key: string): unknown }
	let targetSettings: BuildSettings | undefined
	if (appTarget) {
		try {
			const config = appTarget.getDefaultConfiguration()
			targetConfig = config
			const bs = config.props.buildSettings
			targetSettings = is.plainObject(bs) ? bs : undefined
		} catch {
			// Target may not have a valid build configuration
		}
	}

	let projectSettings: BuildSettings | undefined
	try {
		const projectConfig =
			root.props.buildConfigurationList.props.buildConfigurations.find(
				(c) => c.props.name === 'Release',
			) ?? root.props.buildConfigurationList.getDefaultConfiguration()
		const pbs = projectConfig.props.buildSettings
		projectSettings = is.plainObject(pbs) ? pbs : undefined
	} catch {
		// Project may not have valid build configurations
	}

	// ─── Name ────────────────────────────────────────────────────────

	const displayName = getSetting(
		targetSettings,
		projectSettings,
		'INFOPLIST_KEY_CFBundleDisplayName',
	)
	const productName = getResolvedSetting(
		targetConfig,
		targetSettings,
		projectSettings,
		'PRODUCT_NAME',
	)
	const targetName = appTarget ? cleanString(appTarget.props.name) : undefined

	// ─── Organization ────────────────────────────────────────────────

	const organizationName = cleanString(root.props.attributes.ORGANIZATIONNAME)

	// ─── Copyright ───────────────────────────────────────────────────

	const copyrightString = getSetting(
		targetSettings,
		projectSettings,
		'INFOPLIST_KEY_NSHumanReadableCopyright',
	)
	const { copyrightHolder, copyrightYear } = parseCopyrightString(copyrightString)

	// ─── Programming Language ────────────────────────────────────────

	const swiftVersion = getSetting(targetSettings, projectSettings, 'SWIFT_VERSION')
	let programmingLanguage: string | undefined
	if (swiftVersion) {
		programmingLanguage = 'Swift'
	} else {
		const cStandard = getSetting(targetSettings, projectSettings, 'GCC_C_LANGUAGE_STANDARD')
		if (cStandard) {
			programmingLanguage = 'Objective-C'
		}
	}

	return pbxprojSchema.parse({
		copyrightHolder,
		copyrightYear,
		dependencies: parseDependencies(root),
		identifier: getResolvedSetting(
			targetConfig,
			targetSettings,
			projectSettings,
			'PRODUCT_BUNDLE_IDENTIFIER',
		),
		name: displayName ?? productName ?? targetName,
		operatingSystems: parseOperatingSystems(targetSettings, projectSettings),
		organizationName,
		programmingLanguage,
		version: getSetting(targetSettings, projectSettings, 'MARKETING_VERSION'),
	})
}

// ─── Helpers ────────────────────────────────────────────────────────

type BuildSettings = Record<string, unknown>

/**
 * Get a string build setting, filtering out empty strings and unresolved
 * Xcode variable placeholders. Handles both string and numeric values.
 */
function cleanString(value: unknown): string | undefined {
	if (typeof value === 'number') return String(value)
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (trimmed.length === 0) return undefined
	if (XCODE_VARIABLE_RE.test(trimmed)) return undefined
	return trimmed
}

/**
 * Get a build setting from a target, cascading to project-level if not found.
 */
function getSetting(
	targetSettings: BuildSettings | undefined,
	projectSettings: BuildSettings | undefined,
	key: string,
): string | undefined {
	const targetValue = cleanString(targetSettings?.[key])
	if (targetValue !== undefined) return targetValue

	return cleanString(projectSettings?.[key])
}

/**
 * Try to resolve a build setting using `@bacons/xcode`'s variable resolution,
 * then fall back to raw value.
 */
function getResolvedSetting(
	config: undefined | { resolveBuildSetting(key: string): unknown },
	targetSettings: BuildSettings | undefined,
	projectSettings: BuildSettings | undefined,
	key: string,
): string | undefined {
	if (config) {
		try {
			const resolved = config.resolveBuildSetting(key)
			const cleaned = cleanString(resolved)
			if (cleaned !== undefined) return cleaned
		} catch {
			// Fall through to raw value
		}
	}

	return getSetting(targetSettings, projectSettings, key)
}

/**
 * Parse copyright information from a copyright string.
 */
function parseCopyrightString(copyrightSource: string | undefined): {
	copyrightHolder?: string
	copyrightYear?: string
} {
	if (!copyrightSource) return {}

	const yearMatch = /(?:©|\(c\)|copyright)\s*(\d{4})/i.exec(copyrightSource)
	const copyrightYear = yearMatch?.[1]

	const holderMatch = /(?:©|\(c\)|copyright)\s*\d{4}\s*(.+)/i.exec(copyrightSource)
	let copyrightHolder: string | undefined
	if (holderMatch) {
		copyrightHolder = holderMatch[1]
			.replace(/\.\s*all\s+rights\s+reserved\.?/i, '')
			.replace(/[.,;]+$/, '')
			.trim()
		if (copyrightHolder.length === 0) copyrightHolder = undefined
	}

	return { copyrightHolder, copyrightYear }
}

/**
 * Infer operating systems from deployment target build settings.
 */
function parseOperatingSystems(
	targetSettings: BuildSettings | undefined,
	projectSettings: BuildSettings | undefined,
): string[] {
	const results: string[] = []
	const seen = new Set<string>()

	for (const { key, os } of DEPLOYMENT_TARGETS) {
		const version = getSetting(targetSettings, projectSettings, key)
		if (version) {
			const value = `${os} >= ${version}`
			if (!seen.has(value)) {
				seen.add(value)
				results.push(value)
			}
		}
	}

	// Fallback to SDKROOT if no deployment targets found
	if (results.length === 0) {
		const sdkroot = getSetting(targetSettings, projectSettings, 'SDKROOT')
		if (sdkroot && sdkroot !== 'auto') {
			const os = SDKROOT_MAP[sdkroot]
			if (os) results.push(os)
		}
	}

	return results
}

/**
 * Extract Swift Package Manager dependencies.
 */
function parseDependencies(
	root: InstanceType<typeof XcodeProject>['rootObject'],
): PbxprojDependency[] {
	const packageReferences = root.props.packageReferences ?? []
	const results: PbxprojDependency[] = []

	for (const packageReference of packageReferences) {
		if (!XCRemoteSwiftPackageReference.is(packageReference)) continue
		const url = cleanString(packageReference.props.repositoryURL)
		if (url) {
			results.push({ url })
		}
	}

	return results
}

// ─── Source ──────────────────────────────────────────────────────────

/**
 * Find the first `*.xcodeproj/project.pbxproj` file in a directory.
 * Returns the full path or undefined if not found.
 */
async function findPbxprojFile(directoryPath: string): Promise<string | undefined> {
	try {
		const entries = await readdir(directoryPath, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isDirectory() && entry.name.endsWith('.xcodeproj')) {
				const pbxprojPath = resolve(directoryPath, entry.name, 'project.pbxproj')
				try {
					await stat(pbxprojPath)
					return pbxprojPath
				} catch {
					// Project.pbxproj doesn't exist inside this .xcodeproj
				}
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return undefined
}

export const xcodeProjectPbxprojSource: MetadataSource<'xcodeProjectPbxproj'> = {
	async extract(context: SourceContext): Promise<XcodeProjectPbxprojData> {
		log.debug('Extracting pbxproj metadata...')

		const filePath = await findPbxprojFile(context.path)
		if (!filePath) return undefined

		const data = parse(filePath)
		if (!data) return undefined
		return { data, source: filePath }
	},
	async isAvailable(context: SourceContext): Promise<boolean> {
		const filePath = await findPbxprojFile(context.path)
		return filePath !== undefined
	},
	key: 'xcodeProjectPbxproj',
}
