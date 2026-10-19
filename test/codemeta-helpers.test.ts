import { describe, expect, it } from 'vitest'
import { mergeCodemetaDependencies, toDependencyLd } from '../src/lib/utilities/codemeta-helpers'

describe('mergeCodemetaDependencies', () => {
	it('should keep a version the manifest sets over the codemeta.json version', () => {
		const result = mergeCodemetaDependencies(
			[toDependencyLd('Servo', '1.0.0')],
			[
				toDependencyLd('servo', '2.0.0', undefined, undefined, {
					url: 'https://example.com/servo',
				}),
			],
		)
		expect(result).toEqual([
			{
				'@type': 'SoftwareApplication',
				name: 'Servo',
				url: 'https://example.com/servo',
				version: '1.0.0',
			},
		])
	})

	it('should append codemeta.json entries that match no manifest entry', () => {
		const result = mergeCodemetaDependencies(
			[toDependencyLd('com.example.osc', undefined, 'com.example.osc')],
			[toDependencyLd('Cinder', '0.9.1dev')],
		)
		expect(result.map((dependency) => dependency.name)).toEqual(['com.example.osc', 'Cinder'])
	})

	it('should match each codemeta.json entry at most once', () => {
		const result = mergeCodemetaDependencies(
			[toDependencyLd('a', undefined, 'shared'), toDependencyLd('b', undefined, 'shared')],
			[toDependencyLd('Shared', '1.0.0', 'shared')],
		)
		expect(result).toEqual([
			{ '@type': 'SoftwareApplication', identifier: 'shared', name: 'a', version: '1.0.0' },
			{ '@type': 'SoftwareApplication', identifier: 'shared', name: 'b' },
		])
	})
})
