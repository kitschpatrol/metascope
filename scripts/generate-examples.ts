import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getMetadata } from '../src/lib'

type Options = Parameters<typeof getMetadata>[0]

async function generateExample(name: string, options?: Options): Promise<string> {
	const metadata = await getMetadata(options)
	const destination = resolve(`./docs/${name}.json`)
	await mkdir(dirname(destination), { recursive: true })

	// Replace absolute paths...
	const jsonString = JSON.stringify(metadata, undefined, 2).replaceAll(
		process.cwd(),
		'/Users/Someone/metascope',
	)

	await writeFile(`./docs/${name}.json`, jsonString)
	return destination
}

const report = await Promise.all([
	generateExample('metascope-basic'),
	generateExample('metascope-template-codemeta', {
		template: 'codemeta',
	}),
	generateExample('metascope-template-frontmatter', {
		template: 'frontmatter',
		templateData: {
			authorName: 'Eric Mika',
			githubAccount: 'kitschpatrol',
		},
	}),
	generateExample('metascope-template-metadata', {
		template: 'metadata',
	}),
	generateExample('metascope-template-project', {
		template: 'project',
		templateData: {
			authorName: 'Eric Mika',
			githubAccount: 'kitschpatrol',
		},
	}),
])

console.log(report)
