import { getMetadata } from '../src/lib'

const metadata = await getMetadata({
	offline: false,
	// Path: './test/fixtures/all-sources',
	path: '/Users/mika/Code/tweakpane-plugin-inputs',
	template: 'frontmatter',
	templateData: {
		authorName: ['Eric Mika', 'Theresa Loong'],
		githubAccount: ['kitschpatrol', 'scalarstudio'],
	},
	workspaces: true,
})

console.log(JSON.stringify(metadata.Status, undefined, 2))
console.log(JSON.stringify(metadata.Author, undefined, 2))
console.log(JSON.stringify(metadata.Contributor, undefined, 2))
console.log(JSON.stringify(metadata.Maintainer, undefined, 2))
// Console.log(JSON.stringify(metadata['Secondary Language'], undefined, 2))
// console.log(JSON.stringify(metadata.nodePackageJson, undefined, 2))

//🎉 All metadata parsing complete in 5m 9s (1.8s/project)
