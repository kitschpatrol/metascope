import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: true,
	path: '/Users/mika/Code/Cinder-Test',
	recursive: true,
})

console.log(metadata.cinderCinderblockXml)
