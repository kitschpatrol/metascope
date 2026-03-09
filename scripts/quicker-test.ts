import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	path: '/Users/mika/Code/metascope',
})

// Console.log(JSON.stringify(metadata, undefined, 2))
