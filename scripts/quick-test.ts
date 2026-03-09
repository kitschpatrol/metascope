import { globby } from 'globby'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getMetadata } from '../src/lib'

const sourceDirectory = '/Users/mika/Code'
const destinationDirectory = '/Users/mika/Desktop/metascope-test'

const codeFolders = await globby('*', {
	cwd: sourceDirectory,
	onlyDirectories: true,
})

// Create dir if not needed (recursive: true prevents errors if it already exists)
await mkdir(destinationDirectory, { recursive: true })

// Run getMetadata on each folder, save nicely formatted JSON output to a file
for (const folder of codeFolders) {
	try {
		// Reconstruct the full path so getMetadata knows exactly where to look
		const fullFolderPath = join(sourceDirectory, folder)

		// Assuming getMetadata is async; if it's synchronous, you can remove 'await'
		const metadata = await getMetadata({
			path: fullFolderPath,
		})

		// Format JSON with a 2-space indent
		const jsonOutput = JSON.stringify(metadata, undefined, 2)
		const outputPath = join(destinationDirectory, `${folder}.json`)

		// Write the file to the destination
		await writeFile(outputPath, jsonOutput, 'utf8')

		console.log(`✅ Successfully saved metadata for ${folder}`)
	} catch (error) {
		console.error(`❌ Error processing ${folder}:`, error)
	}
}
