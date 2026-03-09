import { knipConfig } from '@kitschpatrol/knip-config'

export default knipConfig({
	entry: [
		// Many exported helpers not yet used elsewhere...
		'./src/lib/utilities/*.ts',
	],
	ignoreDependencies: ['tree-sitter-ruby', 'tree-sitter-python'],
})
