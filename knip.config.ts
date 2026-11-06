import { knipConfig } from '@kitschpatrol/knip-config'

export default knipConfig({
	entry: [
		// Many exported helpers not yet used elsewhere...
		'./src/lib/utilities/*.ts',
		// Many exported types...
		'./src/lib/sources/*.ts',
	],
	ignoreDependencies: [
		'tree-sitter-ruby',
		'tree-sitter-python',
		'@kitschpatrol/chagent', // Typically invoked through bumpp's --execute argument, which Knip doesn't parse
	],
})
