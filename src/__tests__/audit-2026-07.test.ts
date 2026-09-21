/**
 * Audit Remediation Regression Tests — July 2026
 *
 * Locks in the fixes from the 2026-07-01 runtime-verified audit:
 * - A1: undefined in collections must encode as 0xf7 (not 0xf6)
 * - A3: automatic bignum (tag 2/3) encoding for bigints beyond ±2^64
 * - A4: encoder/parser maxDepth symmetry (both default to 100)
 * - A5: parseSequence container items parse buffer-natively (no O(N²))
 * - A6: containers nested under tags get full canonical/dup-key validation
 * - C13: tag 55799 self-described CBOR (encode + decode unwrap)
 * - C14: tags 21-23 expected-encoding interpretation helper
 * - C15: tag 33/34 base64url/base64 alphabet validation
 * - C16: full fromDiagnostic RFC 8949 §8 parser
 * - C17: DiagnosticOptions.showOffsets wired via decodeToDiagnostic
 */

import { describe, it, expect } from 'vitest'
import {
  decode,
  encode,
  encodeSelfDescribed,
  toDiagnostic,
  fromDiagnostic,
  decodeToDiagnostic,
  useCborParser,
  useCborTag,
  DEFAULT_ENCODE_OPTIONS,
  DEFAULT_LIMITS
} from '../index'
import type { TaggedValue } from '../index'
import { INDEFINITE_SYMBOL } from '../parser/types'

describe('A1 — undefined in collections encodes as 0xf7', () => {
  it('encodes [undefined] as 81f7', () => {
    expect(encode([undefined]).hex).toBe('81f7')
  })

  it('encodes [null] as 81f6 (unchanged)', () => {
    expect(encode([null]).hex).toBe('81f6')
  })

  it('encodes undefined map values as f7', () => {
    const map = new Map<string, undefined | null>([['a', undefined], ['b', null]])
    expect(encode(map).hex).toBe('a26161f76162f6')
  })

  it('encodes nested undefined as f7', () => {
    expect(encode([[undefined], { x: undefined }]).hex).toBe('8281f7a16178f7')
  })

  it('round-trips undefined inside arrays', () => {
    const decoded = decode(encode([undefined, null, true]).hex)
    expect(decoded.value).toEqual([undefined, null, true])
  })

  it('round-trips undefined at the top level (unchanged)', () => {
    expect(encode(undefined).hex).toBe('f7')
    expect(decode('f7').value).toBe(undefined)
  })
})

describe('A3 — automatic bignum (tag 2/3) encoding', () => {
  it('encodes 2^70 as tag 2 with minimal big-endian bytes', () => {
    // 2^70 = 0x40 followed by 8 zero bytes → 9 content bytes
    expect(encode(2n ** 70n).hex).toBe('c249400000000000000000')
  })

  it('encodes -(2^70) as tag 3 (-1-n encoding)', () => {
    // -1 - (-(2^70)) = 2^70 - 1 = 0x3f ff ff ff ff ff ff ff ff
    expect(encode(-(2n ** 70n)).hex).toBe('c3493fffffffffffffffff')
  })

  it('round-trips decode(encode(2^70))', () => {
    const decoded = decode(encode(2n ** 70n).hex)
    expect((decoded.value as TaggedValue).tag).toBe(2)
    expect((decoded.value as TaggedValue).value).toBe(2n ** 70n)
  })

  it('round-trips a decoded tag-2 wrapper back to the original bytes', () => {
    const hex = 'c249010000000000000000' // 2(2^64)
    const decoded = decode(hex)
    expect(encode(decoded.value as TaggedValue).hex).toBe(hex)
  })

  it('round-trips a decoded tag-3 wrapper back to the original bytes', () => {
    const hex = 'c349010000000000000000' // 3(-1 - 2^64)
    const decoded = decode(hex)
    expect((decoded.value as TaggedValue).value).toBe(-1n - 2n ** 64n)
    expect(encode(decoded.value as TaggedValue).hex).toBe(hex)
  })

  it('emits no leading zero bytes (deterministic minimal length)', () => {
    // 2^64 → exactly 9 bytes: 01 00…00
    expect(encode(2n ** 64n).hex).toBe('c249010000000000000000')
  })

  it('bigints inside collections also use bignum encoding', () => {
    expect(encode([2n ** 70n]).hex).toBe('81c249400000000000000000')
  })

  it('bigints that fit in 64 bits still use major type 0/1 (preferred serialization)', () => {
    expect(encode(2n ** 64n - 1n).hex).toBe('1bffffffffffffffff')
    expect(encode(-(2n ** 64n)).hex).toBe('3bffffffffffffffff')
    expect(encode(2n ** 64n - 1n, { canonical: true }).hex).toBe('1bffffffffffffffff')
  })

  it('respects maxBignumBytes', () => {
    expect(() => encode(2n ** 70n, { maxBignumBytes: 4 }))
      .toThrow(/Bignum size 9 bytes exceeds limit of 4 bytes/)
  })

  it('rejects sign-mismatched explicit tag 2/3 wrappers', () => {
    expect(() => encode({ tag: 2, value: -5n })).toThrow(/Tag 2.*negative/)
    expect(() => encode({ tag: 3, value: 5n })).toThrow(/Tag 3.*negative bigint/)
  })
})

describe('A4 — encoder/parser depth symmetry', () => {
  it('encoder default maxDepth is 100 (matches parser DEFAULT_LIMITS)', () => {
    expect(DEFAULT_ENCODE_OPTIONS.maxDepth).toBe(100)
    expect(DEFAULT_LIMITS.maxDepth).toBe(100)
  })

  it('re-encodes a 100-deep nested array it just decoded', () => {
    const hex = '81'.repeat(99) + '80'
    const decoded = decode(hex)
    const reEncoded = encode(decoded.value as unknown[])
    expect(reEncoded.hex).toBe(hex)
  })
})

describe('A5 — parseSequence handles many container items (buffer-native)', () => {
  const { parseSequence } = useCborParser()

  it('parses a sequence of 1000 arrays correctly', () => {
    const hex = '8101'.repeat(1000)
    const values = parseSequence(hex)
    expect(values.length).toBe(1000)
    expect(values[0]).toEqual([1])
    expect(values[999]).toEqual([1])
  })

  it('parses mixed container sequences (arrays, maps, tags)', () => {
    const hex = '8101' + 'a1616101' + 'c101' + '05'
    const values = parseSequence(hex)
    expect(values.length).toBe(4)
    expect(values[0]).toEqual([1])
    expect(values[1]).toEqual(new Map([['a', 1]]))
    expect(values[2]).toEqual({ tag: 1, value: 1 })
    expect(values[3]).toBe(5)
  })

  it('parses a large container sequence well within the parse timeout', () => {
    // Coarse perf sanity: 5000 container items previously re-hexed the whole
    // remaining tail per item (O(N²)); buffer-native parsing keeps this fast.
    const hex = '8101'.repeat(5000)
    const started = Date.now()
    const values = parseSequence(hex, { limits: { maxParseTime: 10000 } })
    expect(values.length).toBe(5000)
    expect(Date.now() - started).toBeLessThan(5000)
  })
})

describe('A6 — full validation for containers nested under tags', () => {
  it('canonical mode rejects wrongly-ordered map keys inside a tagged value', () => {
    // tag 42( {"b": 0, "a": 0} ) — "b" before "a" violates canonical order
    const hex = 'd82aa26162006161' + '00'
    expect(() => decode(hex, { validateCanonical: true, dupMapKeyMode: 'allow' }))
      .toThrow(/canonical order/)
  })

  it('canonical mode accepts correctly-ordered map keys inside a tagged value', () => {
    const hex = 'd82aa26161006162' + '00' // tag 42( {"a": 0, "b": 0} )
    const result = decode(hex, { validateCanonical: true })
    expect((result.value as TaggedValue).tag).toBe(42)
  })

  it("dupMapKeyMode 'reject' fires for duplicate keys inside a tagged value", () => {
    // tag 42( {"a": 0, "a": 1} )
    const hex = 'd82aa2616100616101'
    expect(() => decode(hex, { dupMapKeyMode: 'reject' }))
      .toThrow(/Duplicate map key/)
  })

  it('canonical length checks apply to arrays nested under tags', () => {
    // tag 42( array with non-canonical 1-byte length 1 (AI=24) )
    const hex = 'd82a980101'
    expect(() => decode(hex, { validateCanonical: true }))
      .toThrow(/Non-canonical length encoding/)
  })
})

describe('C13 — tag 55799 self-described CBOR', () => {
  it('encodeSelfDescribed prefixes d9d9f7', () => {
    expect(encodeSelfDescribed(100).hex).toBe('d9d9f71864')
  })

  it('encode with selfDescribed option prefixes d9d9f7', () => {
    expect(encode([1, 2], { selfDescribed: true }).hex).toBe('d9d9f7820102')
  })

  it('does not double-wrap nested tagged values', () => {
    expect(encode({ tag: 1, value: 2 }, { selfDescribed: true }).hex).toBe('d9d9f7c102')
    expect(encode([{ tag: 1, value: 2 }], { selfDescribed: true }).hex).toBe('d9d9f781c102')
  })

  it('decode keeps the tag by default', () => {
    const result = decode('d9d9f71864')
    expect(result.value).toEqual({ tag: 55799, value: 100 })
  })

  it('decode with unwrapSelfDescribed returns the inner value', () => {
    const result = decode('d9d9f71864', { unwrapSelfDescribed: true })
    expect(result.value).toBe(100)
    expect(result.bytesRead).toBe(5)
  })

  it('unwrapSelfDescribed works on Uint8Array input', () => {
    const bytes = encodeSelfDescribed([1, 2, 3]).bytes
    const result = decode(bytes, { unwrapSelfDescribed: true })
    expect(result.value).toEqual([1, 2, 3])
  })

  it('unwrapSelfDescribed leaves non-55799 values untouched', () => {
    expect(decode('c102', { unwrapSelfDescribed: true }).value).toEqual({ tag: 1, value: 2 })
    expect(decode('05', { unwrapSelfDescribed: true }).value).toBe(5)
  })

  it('full round-trip: encodeSelfDescribed → decode(unwrapSelfDescribed)', () => {
    const original = new Map<unknown, unknown>([[1, 'a'], ['b', [2n ** 70n]]])
    const { hex } = encodeSelfDescribed(original)
    expect(hex.startsWith('d9d9f7')).toBe(true)
    const { value } = decode(hex, { unwrapSelfDescribed: true })
    expect(value).toEqual(new Map<unknown, unknown>([[1, 'a'], ['b', [{ tag: 2, value: 2n ** 70n }]]]))
  })
})

describe('C14 — tags 21-23 expected later encodings', () => {
  const { applyExpectedEncoding } = useCborTag()

  it('decode passes tags 21-23 through as { tag, value }', () => {
    // 21(h'fbef')
    const result = decode('d542fbef')
    expect(result.value).toEqual({ tag: 21, value: new Uint8Array([0xfb, 0xef]) })
  })

  it('tag 21 converts to base64url without padding', () => {
    expect(applyExpectedEncoding({ tag: 21, value: new Uint8Array([0xfb, 0xef]) }))
      .toBe('--8')
  })

  it('tag 22 converts to base64 with padding', () => {
    expect(applyExpectedEncoding({ tag: 22, value: new Uint8Array([1, 2, 3]) }))
      .toBe('AQID')
    expect(applyExpectedEncoding({ tag: 22, value: new Uint8Array([0xfb, 0xef]) }))
      .toBe('++8=')
  })

  it('tag 23 converts to lowercase base16', () => {
    expect(applyExpectedEncoding({ tag: 23, value: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) }))
      .toBe('deadbeef')
  })

  it('returns null for non-21/22/23 tags and non-byte content', () => {
    expect(applyExpectedEncoding({ tag: 1, value: new Uint8Array([1]) })).toBeNull()
    expect(applyExpectedEncoding({ tag: 21, value: 'text' })).toBeNull()
  })
})

describe('C15 — tag 32-36 semantic validation (validateTagSemantics)', () => {
  it('tag 32 requires a text string that looks like a URI', () => {
    // 32("http://a") is valid
    const ok = decode('d82068687474703a2f2f61', { validateTagSemantics: true })
    expect((ok.value as TaggedValue).tag).toBe(32)
    // 32("noscheme") is invalid
    expect(() => decode('d820686e6f736368656d65', { validateTagSemantics: true }))
      .toThrow(/Tag 32.*URI/)
    // 32(5) is invalid (not text)
    expect(() => decode('d82005', { validateTagSemantics: true }))
      .toThrow(/Tag 32.*text string/)
  })

  it('tag 33 validates the base64url alphabet', () => {
    // 33("ab-_") valid: complete quartet, URL alphabet
    const ok = decode('d8216461622d5f', { validateTagSemantics: true })
    expect((ok.value as TaggedValue).tag).toBe(33)
    // 33("a+b") invalid ('+' not in base64url alphabet)
    expect(() => decode('d82163612b62', { validateTagSemantics: true }))
      .toThrow(/base64url alphabet/)
    // Without the option: passes through
    expect((decode('d82163612b62').value as TaggedValue).tag).toBe(33)
  })

  it('tag 34 validates the base64 alphabet (padding allowed)', () => {
    // 34("ab+/") valid
    expect((decode('d8226461622b2f', { validateTagSemantics: true }).value as TaggedValue).tag).toBe(34)
    // 34("AQID=") valid-ish padding accepted → construct "AQ==" (4 chars)
    expect((decode('d8226441513d3d', { validateTagSemantics: true }).value as TaggedValue).tag).toBe(34)
    // 34("a_b") invalid ('_' not in base64 alphabet)
    expect(() => decode('d82263615f62', { validateTagSemantics: true }))
      .toThrow(/base64 alphabet/)
  })

  it('tag 35 (regexp) and tag 36 (MIME) require text strings', () => {
    expect((decode('d823632e2a24', { validateTagSemantics: true }).value as TaggedValue).tag).toBe(35)
    expect(() => decode('d82305', { validateTagSemantics: true }))
      .toThrow(/Tag 35.*text string/)
    expect(() => decode('d82405', { validateTagSemantics: true }))
      .toThrow(/Tag 36.*text string/)
  })
})

describe('C16 — fromDiagnostic full RFC 8949 §8 parser', () => {
  it('parses scalars', () => {
    expect(fromDiagnostic('100')).toBe(100)
    expect(fromDiagnostic('-42')).toBe(-42)
    expect(fromDiagnostic('true')).toBe(true)
    expect(fromDiagnostic('false')).toBe(false)
    expect(fromDiagnostic('null')).toBe(null)
    expect(fromDiagnostic('undefined')).toBe(undefined)
    expect(fromDiagnostic('NaN')).toBeNaN()
    expect(fromDiagnostic('Infinity')).toBe(Infinity)
    expect(fromDiagnostic('-Infinity')).toBe(-Infinity)
    expect(Object.is(fromDiagnostic('-0.0'), -0)).toBe(true)
    expect(fromDiagnostic('1.5')).toBe(1.5)
    expect(fromDiagnostic('1e3')).toBe(1000)
  })

  it('parses bigints beyond the safe integer range', () => {
    expect(fromDiagnostic('18446744073709551616')).toBe(18446744073709551616n)
    expect(fromDiagnostic('-18446744073709551617')).toBe(-18446744073709551617n)
  })

  it('accepts hex integers and float width suffixes', () => {
    expect(fromDiagnostic('0xff')).toBe(255)
    expect(fromDiagnostic('1.5_2')).toBe(1.5)
  })

  it('parses strings with escapes', () => {
    expect(fromDiagnostic('"hello"')).toBe('hello')
    expect(fromDiagnostic('"a\\"b\\\\c\\nd\\te"')).toBe('a"b\\c\nd\te')
    expect(fromDiagnostic('"\\u0041\\u00e9"')).toBe('Aé')
  })

  it('parses byte strings (hex and base64url)', () => {
    expect(fromDiagnostic("h'0102ff'")).toEqual(new Uint8Array([1, 2, 0xff]))
    expect(fromDiagnostic("h''")).toEqual(new Uint8Array(0))
    expect(fromDiagnostic("h'01 02 ff'")).toEqual(new Uint8Array([1, 2, 0xff]))
    expect(fromDiagnostic("b64'AQID'")).toEqual(new Uint8Array([1, 2, 3]))
    expect(fromDiagnostic("b64'--8'")).toEqual(new Uint8Array([0xfb, 0xef]))
  })

  it('parses arrays, maps, tags, simple values', () => {
    expect(fromDiagnostic('[1, 2, [3]]')).toEqual([1, 2, [3]])
    expect(fromDiagnostic('{"a": 1, 2: "b"}')).toEqual(new Map<unknown, unknown>([['a', 1], [2, 'b']]))
    expect(fromDiagnostic('121([])')).toEqual({ tag: 121, value: [] })
    expect(fromDiagnostic('1(1363896240)')).toEqual({ tag: 1, value: 1363896240 })
    expect(fromDiagnostic('simple(99)')).toEqual({ simpleValue: 99 })
  })

  it('parses indefinite-length forms', () => {
    const arr = fromDiagnostic('[_ 1, 2]') as number[]
    expect([...arr]).toEqual([1, 2])
    expect((arr as any)[INDEFINITE_SYMBOL]).toBe(true)

    const map = fromDiagnostic('{_ "a": 1}') as Map<string, number>
    expect(new Map(map)).toEqual(new Map([['a', 1]]))
    expect((map as any)[INDEFINITE_SYMBOL]).toBe(true)

    const text = fromDiagnostic('(_ "he" "llo")') as { type: string; text: string }
    expect(text.type).toBe('cbor-text-string')
    expect(text.text).toBe('hello')

    const bytes = fromDiagnostic("(_ h'01' h'02')") as { type: string; bytes: Uint8Array }
    expect(bytes.type).toBe('cbor-byte-string')
    expect(bytes.bytes).toEqual(new Uint8Array([1, 2]))
  })

  it('tolerates arbitrary whitespace', () => {
    expect(fromDiagnostic('  [ 1 ,\n\t2 ,  { "a" :  3 } ]  '))
      .toEqual([1, 2, new Map([['a', 3]])])
  })

  it('rejects malformed input', () => {
    expect(() => fromDiagnostic('')).toThrow(/fromDiagnostic/)
    expect(() => fromDiagnostic('[1, 2')).toThrow(/fromDiagnostic/)
    expect(() => fromDiagnostic('{1}')).toThrow(/fromDiagnostic/)
    expect(() => fromDiagnostic("h'0'")).toThrow(/odd number of hex digits/)
    expect(() => fromDiagnostic('1 2')).toThrow(/trailing content/)
    expect(() => fromDiagnostic('bogus')).toThrow(/fromDiagnostic/)
  })

  it('round-trips fromDiagnostic(toDiagnostic(x)) over a broad corpus', () => {
    const corpus: unknown[] = [
      0, 23, 24, 100, -1, -100, 1000000,
      2n ** 70n, -(2n ** 70n),
      1.5, -2.25, Infinity, -Infinity,
      true, false, null, undefined,
      'hello', 'with "quotes" and \n newline', '',
      new Uint8Array([1, 2, 3]), new Uint8Array(0),
      [1, [2, [3, [4]]]],
      new Map<unknown, unknown>([[1, 'one'], ['two', 2], [new Uint8Array([0xaa]), [1, 2]]]),
      { tag: 1, value: 1363896240 },
      { tag: 121, value: [{ tag: 122, value: [] }] },
      { simpleValue: 99 },
      [new Map<unknown, unknown>([['nested', { tag: 2, value: 2n ** 70n }]])],
    ]

    for (const value of corpus) {
      const diag = toDiagnostic(value)
      expect(fromDiagnostic(diag), `round-trip failed for ${diag}`).toEqual(value)
    }
  })

  it('NaN round-trips through diagnostic notation', () => {
    expect(fromDiagnostic(toDiagnostic(NaN))).toBeNaN()
  })

  it('decode → toDiagnostic → fromDiagnostic → encode round-trips bytes', () => {
    const hexes = ['83010203', 'a26161016162820203', 'c11a514b67b0', 'd87980', 'f97e00']
    for (const hex of hexes) {
      const decoded = decode(hex).value
      const reparsed = fromDiagnostic(toDiagnostic(decoded))
      expect(encode(reparsed as never).hex, `byte round-trip failed for ${hex}`).toBe(hex)
    }
  })
})

describe('C17 — DiagnosticOptions.showOffsets', () => {
  it('annotates values with byte spans', () => {
    expect(decodeToDiagnostic('8101', { showOffsets: true }))
      .toBe('[1 /* 1-2 */] /* 0-2 */')
  })

  it('annotates nested structures and map values', () => {
    const out = decodeToDiagnostic('a161618101', { showOffsets: true })
    // Map {"a": [1]}: whole map 0-5, array 3-5, item 4-5
    expect(out).toContain('/* 0-5 */')
    expect(out).toContain('[1 /* 4-5 */] /* 3-5 */')
  })

  it('annotates tagged values', () => {
    const out = decodeToDiagnostic('c11a514b67b0', { showOffsets: true })
    expect(out).toBe('1(1363896240 /* 1-6 */) /* 0-6 */')
  })

  it('without showOffsets, produces plain diagnostic output', () => {
    expect(decodeToDiagnostic('8101')).toBe('[1]')
  })
})
