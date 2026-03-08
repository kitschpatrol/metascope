/**
 * License file parser types.
 *
 * The actual license identification logic lives in
 * `../utilities/license-identification.ts`. This file defines the
 * output schema for the license-file metadata source.
 */

import { z } from 'zod'
import { stringArray } from '../utilities/schema-primitives'

// ─── Schema ─────────────────────────────────────────────────────────

// eslint-disable-next-line ts/naming-convention, ts/no-unused-vars
const licenseFilesSchema = z.object({
	/** SPDX license URLs identified from license file contents. */
	spdxUrls: stringArray,
})

export type LicenseFiles = z.infer<typeof licenseFilesSchema>

// Re-export identification utilities for convenience
export {
	identifyLicense,
	isLicenseFilename,
	spdxIdToUrl,
} from '../utilities/license-identification'
