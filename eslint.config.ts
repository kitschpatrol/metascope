import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig({
	ignores: ['test/fixtures/*', '.claude/*'],
	type: 'lib',
})
