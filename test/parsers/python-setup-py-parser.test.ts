import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSetupPy } from '../../src/lib/parsers/setup-py-parser'

const fixturesDirectory = resolve('test/fixtures/python-setup-py')

describe('parseSetupPy', () => {
	it('should return an object with basic fields', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = (await parseSetupPy(content)) as any

		expect(result.name).toBe('example-package')
		expect(result.version).toBe('1.2.3')
		expect(result.description).toBeDefined()
		expect(result.author).toBeDefined()
		expect(result.license).toBeDefined()
	})

	it('should return an object with classifiers array', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = (await parseSetupPy(content)) as any

		expect(Array.isArray(result.classifiers)).toBe(true)
		expect(result.classifiers.length).toBeGreaterThan(0)
	})

	it('should return an object with install_requires array', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = (await parseSetupPy(content)) as any

		expect(Array.isArray(result.install_requires)).toBe(true)
		expect(result.install_requires.length).toBeGreaterThan(0)
	})

	it('should return an object with extras_require and project_urls', async () => {
		const content = readFileSync(resolve(fixturesDirectory, 'basic/setup.py'), 'utf8')
		const result = (await parseSetupPy(content)) as any

		expect(typeof result.extras_require).toBe('object')
		expect(typeof result.project_urls).toBe('object')
	})

	it('should parse all fixtures without throwing', async () => {
		const entries = await readdir(fixturesDirectory, { withFileTypes: true })
		const directories = entries.filter((entry) => entry.isDirectory())

		expect(directories.length).toBeGreaterThan(0)

		let parsedCount = 0
		for (const directory of directories) {
			const directoryPath = resolve(fixturesDirectory, directory.name)
			const files = await readdir(directoryPath)
			const setupPyFile = files.find((name) => name === 'setup.py')
			if (!setupPyFile) continue

			const content = readFileSync(resolve(directoryPath, setupPyFile), 'utf8')
			await expect(parseSetupPy(content)).resolves.toBeDefined()
			parsedCount++
		}

		expect(parsedCount).toBe(110)
	})
})
