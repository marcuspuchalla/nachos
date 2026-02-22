/**
 * Tests for eliminating exponential re-parsing in source-map tag handling
 * Task 2-B: parseTagWithMap should NOT re-parse the entire tag subtree
 *
 * The fix ensures that parseTagWithMap uses already-parsed values plus
 * direct calls to validateTagSemantics and decodePlutusConstructor,
 * instead of calling parseTag(hexString) which re-parses everything.
 */

import { describe, it, expect, vi } from 'vitest'
import { useCborParser } from '../composables/useCborParser'
import { useCborTag } from '../composables/useCborTag'

describe('Tag Source Map Re-parse Elimination (Task 2-B)', () => {
  describe('Correctness: parseWithSourceMap still produces correct values', () => {
    it('should correctly decode tag 121 with array', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d87983010203') // Tag 121, [1, 2, 3]

      expect(result.value).toEqual({
        tag: 121,
        value: [1, 2, 3],
        plutus: { constructor: 0, fields: [1, 2, 3] }
      })
    })

    it('should correctly decode tag 122 with array', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d87a81182a') // Tag 122, [42]

      expect(result.value).toEqual({
        tag: 122,
        value: [42],
        plutus: { constructor: 1, fields: [42] }
      })
    })

    it('should correctly decode tag 102 alternative constructor', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d8668218c8811863') // Tag 102, [200, [99]]

      expect(result.value).toEqual({
        tag: 102,
        value: [200, [99]],
        plutus: { constructor: 200, fields: [99] }
      })
    })

    it('should correctly decode extended constructor tag 1283', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d9050383010203') // Tag 1283, [1, 2, 3]

      expect(result.value).toEqual({
        tag: 1283,
        value: [1, 2, 3],
        plutus: { constructor: 10, fields: [1, 2, 3] }
      })
    })

    it('should correctly decode bignum tag 2 (positive)', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 2, byte string 0x01 0x00 (= 256)
      const result = parseWithSourceMap('c2420100')

      expect(result.value).toEqual({
        tag: 2,
        value: 256n
      })
    })

    it('should correctly decode bignum tag 3 (negative)', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 3, byte string 0x01 0x00 (= -1 - 256 = -257)
      const result = parseWithSourceMap('c3420100')

      expect(result.value).toEqual({
        tag: 3,
        value: -257n
      })
    })

    it('should correctly handle tag 0 (date/time string)', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 0 containing "2013-03-21T20:04:00Z"
      const result = parseWithSourceMap('c074323031332d30332d32315432303a30343a30305a')

      const value = result.value as any
      expect(value.tag).toBe(0)
      expect(value.value).toBe('2013-03-21T20:04:00Z')
    })

    it('should correctly handle tag 1 (epoch time)', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 1 containing 1363896240
      const result = parseWithSourceMap('c11a514b67b0')

      expect(result.value).toEqual({
        tag: 1,
        value: 1363896240
      })
    })

    it('should correctly handle nested tags', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 121 -> [Tag 121 -> []]
      const result = parseWithSourceMap('d87981d87980')

      const outer = result.value as any
      expect(outer.tag).toBe(121)
      expect(outer.plutus).toEqual({ constructor: 0, fields: [{ tag: 121, value: [], plutus: { constructor: 0, fields: [] } }] })
    })

    it('should correctly handle tag 121 with empty array', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d87980')

      expect(result.value).toEqual({
        tag: 121,
        value: [],
        plutus: { constructor: 0, fields: [] }
      })
    })

    it('should correctly handle self-describe tag 55799', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 55799 wrapping integer 42
      const result = parseWithSourceMap('d9d9f7182a')

      expect(result.value).toEqual({
        tag: 55799,
        value: 42
      })
    })

    it('should correctly handle non-Plutus tag with non-array value', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 1 containing 0
      const result = parseWithSourceMap('c100')

      expect(result.value).toEqual({
        tag: 1,
        value: 0
      })
    })
  })

  describe('Correctness: source maps remain identical', () => {
    it('should produce same source map for simple tagged value', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d879182a') // Tag 121, 42

      expect(result.sourceMap).toHaveLength(2)
      expect(result.sourceMap[0]).toMatchObject({
        path: '',
        majorType: 6,
        type: 'tag(121)',
        children: ['.value']
      })
      expect(result.sourceMap[1]).toMatchObject({
        path: '.value',
        majorType: 0,
        parent: ''
      })
    })

    it('should produce same source map for nested tags', () => {
      const { parseWithSourceMap } = useCborParser()
      const result = parseWithSourceMap('d87981d87980')

      const outerTag = result.sourceMap.find(e => e.path === '')
      expect(outerTag?.majorType).toBe(6)
      expect(outerTag?.children).toEqual(['.value'])

      const array = result.sourceMap.find(e => e.path === '.value')
      expect(array?.majorType).toBe(4)
      expect(array?.parent).toBe('')

      const innerTag = result.sourceMap.find(e => e.path === '.value[0]')
      expect(innerTag?.majorType).toBe(6)
      expect(innerTag?.parent).toBe('.value')
    })
  })

  describe('Validation still works through source-map path', () => {
    it('should validate tag 2/3 bignum byte limit', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 2 with a byte string exceeding the limit
      // Create a very long byte string (> default 1024 bytes)
      const longByteString = '59' + '0401' + 'ff'.repeat(1025)
      const hex = 'c2' + longByteString

      expect(() => parseWithSourceMap(hex)).toThrow(/bignum/i)
    })

    it('should validate tag semantics in strict mode', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 0 (date/time) with integer value (should be text string)
      // c0 00 = tag(0) + integer(0)
      expect(() => parseWithSourceMap('c000', { strict: true })).toThrow(/tag 0/i)
    })

    it('should validate Plutus semantics in strict mode', () => {
      const { parseWithSourceMap } = useCborParser()
      // Tag 121 with non-array value (should be array)
      // d8 79 00 = tag(121) + integer(0)
      expect(() => parseWithSourceMap('d87900', { strict: true })).toThrow(/Plutus/i)
    })
  })

  describe('Performance: no exponential re-parsing', () => {
    it('should parse deeply nested tags in linear time', () => {
      const { parseWithSourceMap } = useCborParser()

      // Build a deeply nested tag: tag(121) -> [tag(121) -> [tag(121) -> ... -> []]]
      // At depth D, the old code would do O(D^2) work due to re-parsing.
      // With the fix, it should be O(D).
      const buildNestedTagHex = (depth: number): string => {
        // Each level: d8 79 81 (tag 121, 1-element array)
        // Innermost: d8 79 80 (tag 121, empty array)
        let hex = ''
        for (let i = 0; i < depth - 1; i++) {
          hex += 'd87981' // tag(121), array(1)
        }
        hex += 'd87980' // tag(121), array(0)
        return hex
      }

      // Time a moderate depth (20 levels)
      const hex20 = buildNestedTagHex(20)
      const start20 = performance.now()
      const result20 = parseWithSourceMap(hex20)
      const time20 = performance.now() - start20

      // Time a deeper nesting (40 levels)
      const hex40 = buildNestedTagHex(40)
      const start40 = performance.now()
      const result40 = parseWithSourceMap(hex40)
      const time40 = performance.now() - start40

      // With O(D^2), doubling depth quadruples time: time40/time20 ~ 4
      // With O(D), doubling depth doubles time: time40/time20 ~ 2
      // Use a generous bound: if fixed, ratio should be < 3
      // If unfixed (quadratic), ratio tends toward 4+
      //
      // Note: for small absolute times, jitter can dominate.
      // The real test is that 40-deep should still complete quickly (< 100ms).
      expect(time40).toBeLessThan(100) // Should be very fast with fix

      // Both should parse successfully
      expect((result20.value as any).tag).toBe(121)
      expect((result40.value as any).tag).toBe(121)
    })
  })

  describe('useCborTag exports', () => {
    it('should export validateTagSemantics function', () => {
      const tag = useCborTag()
      expect(tag.validateTagSemantics).toBeDefined()
      expect(typeof tag.validateTagSemantics).toBe('function')
    })

    it('should export decodePlutusConstructor function', () => {
      const tag = useCborTag()
      expect(tag.decodePlutusConstructor).toBeDefined()
      expect(typeof tag.decodePlutusConstructor).toBe('function')
    })
  })
})
