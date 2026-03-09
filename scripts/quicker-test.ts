import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: true,
	path: '/Users/mika/Code/shared-config',
	recursive: true,
})

console.log(metadata.codeStatistics)
