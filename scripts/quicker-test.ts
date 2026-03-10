import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: true,
	// Path: './test/fixtures/all-sources',
	path: '/Users/mika/Code/shared-config',
	workspaces: true,
})

console.log(JSON.stringify(metadata.metascope, undefined, 2))

//🎉 All metadata parsing complete in 5m 9s (1.8s/project)
