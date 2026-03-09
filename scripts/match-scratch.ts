import { getMatches } from '../src/lib'

const test = async () =>
	getMatches(
		{
			path: '/Users/mika/Code/shared-config',
			recursive: false,
			respectIgnored: true,
			workspaces: false,
		},
		['readme.md'],
	)

const start1 = performance.now()

const result = await test()

const start2 = performance.now()
console.log(start2 - start1)

const moreResults = await test()

console.log(performance.now() - start2)
console.log(result)
console.log(moreResults)
