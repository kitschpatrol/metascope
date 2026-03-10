import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig({
	ignores: ['test/fixtures/*', '.claude/*', '.agents/*'],
	ts: {
		overrides: {
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
