import type { BenchFn, BenchRunOptions, TestContext } from 'vitest'
import type { JsonTestResults } from 'vitest/node'
import { readFile } from 'node:fs/promises'

let baselineReport: JsonTestResults | undefined

/** Compare benchmark results with the saved baseline, or record a new baseline. */
export async function runBenchmark(
	{ bench, task }: Pick<TestContext, 'bench' | 'task'>,
	measure: BenchFn,
	options: BenchRunOptions,
): Promise<void> {
	// Full names include the relative filename, so keys survive moves between machines.
	const runOptions = { ...options, name: task.fullName }
	const current = bench('current', measure)
	if (process.env.METASCOPE_BENCH_BASELINE === 'true') {
		await current.run(runOptions)
		return
	}

	baselineReport ??= JSON.parse(
		await readFile(new URL('baseline.json', import.meta.url), 'utf8'),
	) as JsonTestResults
	const report = baselineReport
	if (!report.success) {
		throw new Error(
			'The saved benchmark report is not a successful Vitest 5 run. Run pnpm bench:baseline.',
		)
	}

	const baseline = report.testResults
		.flatMap((file) => file.assertionResults)
		.flatMap((assertion) => assertion.benchmarks)
		.find((group) => group.name === task.fullName)
		?.tasks.find((entry) => entry.name === 'current')
	if (!baseline) {
		throw new Error(
			`Missing a successful baseline for "${task.fullName}". Run pnpm bench:baseline.`,
		)
	}

	await bench.compare(
		current,
		bench.from('baseline', () => baseline),
		runOptions,
	)
}
