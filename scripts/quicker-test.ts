import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	absolute: false,
	offline: true,
	path: './test/fixtures/all-sources',
	recursive: false,
	respectIgnored: false,
	workspaces: true,
})

console.log(metadata.metascope)
