import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig({
	ignores: ['test/fixtures/*', '.claude/*', '.agents/*'],
	ts: {
		overrides: {
			'unicorn/prevent-abbreviations': [
				'error',
				{
					// Allow variations on goMod and pkgInfo
					ignore: [/go-?mod/i, /pkg-?info/i],
				},
			],
		},
	},
	type: 'lib',
})
