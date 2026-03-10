import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	absolute: false,
	offline: false,
	//
	// path: './test/fixtures/all-sources',
	path: '/Users/mika/Code/Cinder-BarcodeScanner',
	recursive: false,
	respectIgnored: false,
	workspaces: false,
})

console.log(JSON.stringify(metadata, undefined, 2))
