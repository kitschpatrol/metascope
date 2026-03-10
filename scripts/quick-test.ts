import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import prettyMilliseconds from 'pretty-ms'
import { glob } from 'tinyglobby'
import { getMetadata } from '../src/lib'

const startTime = performance.now()

const sourceDirectory = '/Users/mika/Code'
const destinationDirectory = '/Users/mika/Desktop/metascope-test'

const codeFolders = await glob('*', {
	cwd: sourceDirectory,
	onlyDirectories: true,
})

console.log(`Found ${codeFolders.length} folders to process.`)

// Create dir if not needed (recursive: true prevents errors if it already exists)
await mkdir(destinationDirectory, { recursive: true })

// Set a safe concurrency limit (5 to 10 is usually the sweet spot for I/O)
// 01: 4m 3.5s (1s/project)
// 05: 3m 18.5s (821ms/project)
// 10: 3m 18.7s (821ms/project)
const concurrencyLimit = 1

for (let index = 0; index < codeFolders.length; index += concurrencyLimit) {
	// Slice the array into a small batch
	const batch = codeFolders.slice(index, index + concurrencyLimit)

	console.log(
		`⏳ Processing batch ${index / concurrencyLimit + 1} of ${Math.ceil(codeFolders.length / concurrencyLimit)}...`,
	)

	// Process ONLY this batch concurrently
	await Promise.all(
		batch.map(async (folder) => {
			try {
				const fullFolderPath = join(sourceDirectory, folder)
				const metadata = await getMetadata({
					path: fullFolderPath,
					template: 'frontmatter',
					templateData: {
						authorName: ['kitschpatrol', 'Eric Mika', 'eric mika', 'scalarstudio', 'Scalar Studio'],
						githubAccount: ['kitschpatrol', 'scalarstudio'],
					},
				})

				const jsonOutput = JSON.stringify(metadata, undefined, 2)
				const outputPath = join(destinationDirectory, `${folder.replaceAll('/', '')}.json`)

				await writeFile(outputPath, jsonOutput, 'utf8')
				console.log(`✅ Successfully saved metadata for ${folder}`)
			} catch (error) {
				console.error(`❌ Error processing ${folder}:`, error)
			}
		}),
	)
}

const elapsed = performance.now() - startTime
console.log(
	`🎉 All metadata parsing complete in ${prettyMilliseconds(elapsed)} (${prettyMilliseconds(elapsed / codeFolders.length)}/project)`,
)
