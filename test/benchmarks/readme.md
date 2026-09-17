# Benchmarks

Run `pnpm bench` to compare current measurements with the saved baseline.
Run `pnpm bench:baseline` to replace the baseline with a full set of measurements.

`baseline.json` is a Vitest 5 JSON report. The benchmark helper finds saved
measurements by the test's full name, including its relative filename, and passes
them to `bench.from()` for comparison. Normal benchmark runs never update the
baseline. A missing measurement or unsuccessful baseline report fails the run
with instructions to regenerate it.

Generate and compare baselines on the same machine and Node.js version, with
other CPU-intensive tasks stopped. Results from the previous Vitest 4 format
must be regenerated.

## License matching

Run `pnpm bench:licenses` for the deterministic license mutation benchmark. It compares the compact matcher with the frozen results from the previous full-text matcher in `license-matching-baseline.json`. Input hashes prevent silently comparing different cases; this baseline is intentionally not overwritten by the benchmark.

The cases and assertions are shared with `test/license-matching.test.ts`. See [license matching](../../docs/license-matching.md) for the corpus, interpretation, and data generation workflow.
