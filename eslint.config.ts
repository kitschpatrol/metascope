import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig({
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
					ignore: [/go-?mod/iv, /pkg-?info/iv, /setup-?cfg/iv],
				},
			],
		},
	},
	type: 'lib',
})
