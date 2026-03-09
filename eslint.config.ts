import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig({
	ignores: ['test/fixtures/*', '.claude/*', '.agents/*'],
	ts: {
		overrides: {
			'depend/ban-dependencies': [
				'error',
				{
					allowed: ['globby'],
				},
			],
			'unicorn/prevent-abbreviations': [
				'error',
				{
					ignore: [/go-?mod/i, /pkg-?info/i],
				},
			],
		},
	},
	type: 'lib',
})
