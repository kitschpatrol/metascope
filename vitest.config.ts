/* eslint-disable ts/naming-convention */

import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
	test: {
		env: {
			METASCOPE_BENCH_BASELINE: String(mode === 'benchmark-baseline'),
			METASCOPE_TEST_MOCK: process.env.METASCOPE_TEST_MOCK ?? 'true',
		},
		fileParallelism: false,
		sequence: {
			concurrent: false,
		},
		setupFiles: ['./test/setup.ts'],
		silent: 'passed-only',
	},
}))
