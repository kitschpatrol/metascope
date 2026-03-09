import { describe, expect, it } from 'vitest'
import { stripUndefined } from '../src/lib/utilities/formatting'

describe('stripUndefined', () => {
	it('should remove undefined values from a flat object', () => {
		expect(stripUndefined({ a: 1, b: undefined, c: 'hello' })).toEqual({ a: 1, c: 'hello' })
	})

	it('should remove undefined values from nested objects', () => {
		expect(stripUndefined({ a: { b: undefined, c: 1 }, d: 2 })).toEqual({ a: { c: 1 }, d: 2 })
	})

	it('should remove empty objects after stripping', () => {
		expect(stripUndefined({ a: { b: undefined }, c: 1 })).toEqual({ c: 1 })
	})

	it('should remove undefined from arrays', () => {
		expect(stripUndefined([1, undefined, 3])).toEqual([1, 3])
	})

	it('should preserve null values', () => {
		// eslint-disable-next-line unicorn/no-null
		expect(stripUndefined({ a: null, b: 1 })).toEqual({ a: null, b: 1 })
	})

	it('should preserve false and 0', () => {
		expect(stripUndefined({ a: false, b: 0, c: '' })).toEqual({ a: false, b: 0, c: '' })
	})

	it('should handle deeply nested structures', () => {
		const input = {
			a: {
				b: {
					c: undefined,
					d: {
						e: undefined,
					},
				},
				f: 1,
			},
		}
		expect(stripUndefined(input)).toEqual({ a: { f: 1 } })
	})

	it('should return undefined for entirely empty objects', () => {
		expect(stripUndefined({ a: undefined })).toBeUndefined()
	})

	it('should return primitives as-is', () => {
		expect(stripUndefined(42)).toBe(42)
		expect(stripUndefined('hello')).toBe('hello')
		expect(stripUndefined(true)).toBe(true)
	})
})
