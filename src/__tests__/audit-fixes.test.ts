/**
 * Audit Remediation Regression Tests
 *
 * Locks in the fixes from the June 2026 RFC 8949 conformance/security audit.
 * Each test maps to a finding ID (H1, H2, M1-M5, L1, L3, L5).
 */

import { describe, it, expect } from 'vitest'
import { decode, decodeWithSourceMap, encode, encodeToHex, toDiagnostic } from '../index'

describe('Audit fixes', () => {
  describe('H1 — source-map parse path enforces tag-depth limit', () => {
    const deepTag = 'c2'.repeat(60000) + '00'

    it('decode() rejects deeply nested tags cleanly', () => {
      expect(() => decode(deepTag, { limits: { maxTagDepth: 100 } }))
        .toThrow(/Tag nesting depth/)
    })

    it('decodeWithSourceMap() rejects deeply nested tags cleanly (no stack overflow)', () => {
      let err: Error | null = null
      try { decodeWithSourceMap(deepTag, { limits: { maxTagDepth: 100 } }) }
      catch (e) { err = e as Error }
      expect(err).not.toBeNull()
      expect(err!.constructor.name).toBe('Error') // NOT RangeError
      expect(err!.message).toMatch(/Tag nesting depth/)
    })

    it('still decodes legitimately nested tags', () => {
      const r = decode('c1c0' + '60', { limits: { maxTagDepth: 100 } }) // tag1(tag0(""))
      expect((r.value as any).tag).toBe(1)
    })
  })

  describe('H2 — map key ordering (CIP-21 length-first default, bytewise option)', () => {
    // key "aa" -> 62 61 61 (len 3); key 1000000 -> 1a 00 0f 42 40 (len 5)
    const m = new Map<any, any>([['aa', 1], [1000000, 2]])

    it('canonical default is length-first (Cardano CIP-21)', () => {
      expect(encodeToHex(m, { canonical: true })).toBe('a2' + '626161' + '01' + '1a000f4240' + '02')
    })

    it('mapKeyOrder:bytewise yields RFC 8949 §4.2.1 order', () => {
      expect(encodeToHex(m, { canonical: true, mapKeyOrder: 'bytewise' }))
        .toBe('a2' + '1a000f4240' + '02' + '626161' + '01')
    })

    const lenFirst = 'a2' + '626161' + '01' + '1a000f4240' + '02'
    const byteWise = 'a2' + '1a000f4240' + '02' + '626161' + '01'

    it('decoder (default) accepts length-first order', () => {
      expect(() => decode(lenFirst, { validateCanonical: true })).not.toThrow()
    })
    it('decoder (bytewise) accepts bytewise order', () => {
      expect(() => decode(byteWise, { validateCanonical: true, mapKeyOrder: 'bytewise' })).not.toThrow()
    })
    it('decoder (bytewise) rejects length-first order', () => {
      expect(() => decode(lenFirst, { validateCanonical: true, mapKeyOrder: 'bytewise' }))
        .toThrow(/not in canonical order/)
    })

    it('encoder output round-trips through its own canonical decoder (both orders)', () => {
      const lf = encodeToHex(m, { canonical: true })
      const bw = encodeToHex(m, { canonical: true, mapKeyOrder: 'bytewise' })
      expect(() => decode(lf, { validateCanonical: true })).not.toThrow()
      expect(() => decode(bw, { validateCanonical: true, mapKeyOrder: 'bytewise' })).not.toThrow()
    })
  })

  describe('M1 — trailing data well-formedness', () => {
    it('default lenient: reports bytesRead and ignores trailing', () => {
      expect(decode('000102').bytesRead).toBe(1)
    })
    it('allowTrailingData:false rejects trailing bytes', () => {
      expect(() => decode('000102', { allowTrailingData: false })).toThrow(/Trailing data/)
    })
    it('strict mode rejects trailing bytes', () => {
      expect(() => decode('000102', { strict: true })).toThrow(/Trailing data/)
    })
    it('strict mode accepts an exact single item', () => {
      expect(decode('00', { strict: true }).value).toBe(0)
    })
  })

  describe('M2 — encoder maxDepth enforced across tag boundary', () => {
    it('rejects deeply nested tagged values', () => {
      let v: any = 0
      for (let i = 0; i < 300; i++) v = { tag: 6, value: v }
      expect(() => encode(v)).toThrow(/Maximum nesting depth/)
    })
    it('allows shallow nested tagged values', () => {
      let v: any = 0
      for (let i = 0; i < 10; i++) v = { tag: 6, value: v }
      expect(() => encode(v)).not.toThrow()
    })
  })

  describe('M4 — canonical mode enforces shortest-form tag numbers', () => {
    it('rejects non-shortest tag number (d80100)', () => {
      expect(() => decode('d80100', { validateCanonical: true }))
        .toThrow(/Non-canonical/)
    })
    it('accepts shortest tag number (c100)', () => {
      expect(() => decode('c100', { validateCanonical: true })).not.toThrow()
    })
  })

  describe('M5 — float16 subnormals encode to shortest form and stay self-canonical', () => {
    it('encode(2^-24) uses float16, not float32', () => {
      expect(encodeToHex(5.960464477539063e-8)).toMatch(/^f9/)
    })
    it('encoder float output passes its own canonical validation', () => {
      for (const v of [1.5, 65504, 5.960464477539063e-8, 0.1]) {
        const h = encodeToHex(v)
        expect(() => decode(h, { validateCanonical: true }), `value ${v} -> ${h}`).not.toThrow()
      }
    })
  })

  describe('L3 — readUint refuses values above MAX_SAFE_INTEGER (via decode)', () => {
    it('8-byte integer above 2^53 decodes as BigInt without loss', () => {
      // 0x1b + 0102030405060708 -> tag-free uint, larger than MAX_SAFE_INTEGER
      const r = decode('1b0102030405060708')
      expect(typeof r.value).toBe('bigint')
      expect(r.value).toBe(0x0102030405060708n)
    })
  })

  describe('L5 — diagnostic notation', () => {
    it('renders indefinite-length arrays', () => {
      expect(toDiagnostic(decode('9f0102ff').value)).toBe('[_ 1, 2]')
    })
    it('renders unassigned simple values', () => {
      expect(toDiagnostic(decode('f820').value)).toBe('simple(32)')
    })
    it('renders indefinite-length text strings', () => {
      const v = decode('7f626162ff').value // (_ "ab")  from chunks "ab"
      expect(toDiagnostic(v)).toContain('_')
    })
  })
})
