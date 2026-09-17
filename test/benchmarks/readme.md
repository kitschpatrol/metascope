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
