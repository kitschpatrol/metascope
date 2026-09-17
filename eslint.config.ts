import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig(
	{
		ignores: ['test/fixtures/*', '.claude/*', '.agents/*'],
		ts: {
			overrides: {
				// False positives with @typescript-eslint 8.58.0 — treats structural
				// subtypes as matching the default type parameter.
				'ts/no-unnecessary-type-arguments': 'off',
				'unicorn/name-replacements': [
					'error',
					{
						// "cfg" is the literal file extension in Python's setup.cfg
						ignore: [
							'[gG][oO]-?[mM][oO][dD]',
							'[pP][kK][gG]-?[iI][nN][fF][oO]',
							'[sS][eE][tT][uU][pP]-?[cC][fF][gG]',
						],
					},
				],
			},
		},
		type: 'lib',
	},
	{
		files: ['test/*.bench.ts'],
		rules: {
			// Benchmarks report measurements without asserting performance thresholds.
			'test/expect-expect': 'off',
		},
	},
)
