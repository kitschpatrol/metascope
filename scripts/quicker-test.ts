import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: true,
	path: '/Users/mika/Code/shared-config',
	recursive: true,
	workspaces: true,
})

console.log(metadata.fileStatistics)
console.log(metadata.metascope)
