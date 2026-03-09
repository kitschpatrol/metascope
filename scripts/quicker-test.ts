import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: true,
	path: '/Users/mika/Code/shared-config',
	recursive: false,
	workspaces: true,
})

console.log(metadata.nodePackageJson)
console.log(metadata.metascope)
