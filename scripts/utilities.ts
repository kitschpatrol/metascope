import { parse } from '@fast-csv/parse'
import is from '@sindresorhus/is'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)

/**
 * Get a column map from a CSV URL.
 * @returns A promise that resolves to a column map.
 */
export async function getColumnMapFromCsvUrl(url: string): Promise<Record<string, string[]>> {
	const response = await fetch(url)

	if (!response.ok || !response.body) {
		throw new Error(`Failed to fetch: ${response.statusText}`)
	}

	// Convert Web ReadableStream to Node Readable Stream
	// @ts-expect-error -- global ReadableStream is structurally compatible with node:stream/web ReadableStream
	const nodeStream = Readable.fromWeb(response.body)
	const columnMap: Record<string, string[]> = {}

	return new Promise((resolve, reject) => {
		nodeStream
			.pipe(parse({ headers: true, trim: true }))
			.on('error', (error) => {
				reject(error)
			})
			.on('headers', (headers: string[]) => {
				// 2. Pre-initialize our map keys once headers are detected
				for (const h of headers) columnMap[h] = []
			})
			.on('data', (row: Record<string, string>) => {
				// 3. Push each row's value into the corresponding header array
				for (const [key, value] of Object.entries(row)) {
					columnMap[key].push(value)
				}
			})
			.on('end', () => {
				resolve(columnMap)
			})
	})
}

/**
 * Run Prettier with the local configuration on a file.
 */
export async function runPrettierOnFile(filePath: string): Promise<void> {
	await execFileAsync('pnpm', ['ksc-prettier', 'fix', filePath])
}

/**
 * Download a file from a URL and save it to a destination directory, optionally with a specified file name.
 * @returns File path
 */
export async function downloadUrlToFile(
	url: string,
	destinationDirectory: string,
	fileName?: string,
): Promise<string> {
	const response = await fetch(url)
	const content = await response.text()

	// File name should be final segment of URL
	const finalFileName = fileName ?? url.split('/').pop()

	if (!finalFileName) {
		throw new Error(`Could not determine file name from URL: ${url}`)
	}

	// Make destination directory if it doesn't exist
	await fs.mkdir(destinationDirectory, { recursive: true })

	const destination = path.join(destinationDirectory, finalFileName)

	await fs.writeFile(destination, content)
	return destination
}

/**
 * Transform the contents of a file according to a callback function, and save the result back to the file.
 * @returns File path
 */
export async function mutateFile(
	filePath: string,
	mutation: (content: string) => string,
): Promise<string> {
	const content = await fs.readFile(filePath, 'utf8')
	const mutatedContent = mutation(content)
	await fs.writeFile(filePath, mutatedContent)
	return filePath
}

/**
 * Enforce an array.
 * @returns An array.
 */
export function enforceArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value]
}

/**
 * Extract all string values from a POJO.
 * @returns An array of string values.
 */
export function extractAllStringValuesFromPojo(
	value: unknown,
	accumulator: string[] = [],
): string[] {
	if (typeof value === 'string') {
		accumulator.push(value)
	} else if (Array.isArray(value)) {
		for (const item of value) {
			extractAllStringValuesFromPojo(item, accumulator)
		}
	} else if (is.plainObject(value)) {
		for (const item of Object.values(value)) {
			extractAllStringValuesFromPojo(item, accumulator)
		}
	}
	return accumulator
}
