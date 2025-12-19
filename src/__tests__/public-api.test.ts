/**
 * Public API Tests
 *
 * These tests import from the main index.ts to ensure the public API
 * is properly exported and functional. This also provides coverage
 * for the main entry point.
 */

import { describe, it, expect } from 'vitest'

// Import everything from the public API
import {
  // Functional API
  decode,
  decodeWithSourceMap,
  encode,
  encodeToHex,
  encodeToBytes,
  encodeSequence,
  toDiagnostic,
  decodeToDiagnostic,
  // Class API
  CborDecoder,
  CborEncoder,
  // Composables
  useCborParser,
  useCborEncoder,
  useCborInteger,
  useCborString,
  useCborCollection,
  useCborFloat,
  useCborTag,
  useCborDiagnostic,
  useCborIntegerEncoder,
  useCborStringEncoder,
  useCborCollectionEncoder,
  useCborSimpleEncoder,
  // Utilities
  PathBuilder,
  // Constants
  DEFAULT_OPTIONS,
  DEFAULT_LIMITS,
  DEFAULT_ENCODE_OPTIONS,
  CborMajorType,
  CborAdditionalInfo,
  CborSimpleValue,
  CborTag,
} from '../index'

describe('Public API - Functional Decode', () => {
  it('decode() should decode CBOR hex strings', () => {
    // Integer
    const intResult = decode('1864')
    expect(intResult.value).toBe(100)
    expect(intResult.bytesRead).toBe(2)

    // String
    const strResult = decode('6449455446')
    expect(strResult.value).toBe('IETF')

    // Array
    const arrResult = decode('83010203')
    expect(arrResult.value).toEqual([1, 2, 3])

    // Tagged value (Cardano Plutus Constructor 0)
    const tagResult = decode('d87980')
    expect(tagResult.value).toMatchObject({ tag: 121, value: [] })
  })

  it('decode() should accept options', () => {
    const result = decode('1864', { strict: true })
    expect(result.value).toBe(100)
  })

  it('decodeWithSourceMap() should return source map', () => {
    const result = decodeWithSourceMap('d87980')
    expect(result.value).toMatchObject({ tag: 121, value: [] })
    expect(result.sourceMap).toBeDefined()
    expect(Array.isArray(result.sourceMap)).toBe(true)
    expect(result.sourceMap.length).toBeGreaterThan(0)
  })
})

describe('Public API - Functional Encode', () => {
  it('encode() should encode values to CBOR', () => {
    // Integer
    const intResult = encode(100)
    expect(intResult.hex).toBe('1864')
    expect(intResult.bytes).toBeInstanceOf(Uint8Array)

    // String
    const strResult = encode('IETF')
    expect(strResult.hex).toBe('6449455446')

    // Array
    const arrResult = encode([1, 2, 3])
    expect(arrResult.hex).toBe('83010203')

    // Tagged value
    const tagResult = encode({ tag: 121, value: [] })
    expect(tagResult.hex).toBe('d87980')
  })

  it('encode() should accept options', () => {
    const result = encode({ z: 1, a: 2 }, { canonical: true })
    expect(result.hex).toBeDefined()
  })

  it('encodeToHex() should return only hex string', () => {
    const hex = encodeToHex(100)
    expect(hex).toBe('1864')
    expect(typeof hex).toBe('string')
  })

  it('encodeToBytes() should return only bytes', () => {
    const bytes = encodeToBytes(100)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes).toEqual(new Uint8Array([0x18, 0x64]))
  })

  it('encodeSequence() should encode multiple values', () => {
    const result = encodeSequence([1, 2, 3])
    expect(result.hex).toBe('010203')
    expect(result.bytes).toEqual(new Uint8Array([0x01, 0x02, 0x03]))
  })

  it('encode() should preserve -0', () => {
    const result = encode(-0)
    expect(result.hex).toBe('f98000')

    const decoded = decode(result.hex)
    expect(Object.is(decoded.value, -0)).toBe(true)
  })
})

describe('Public API - Diagnostic Notation', () => {
  it('toDiagnostic() should convert values to diagnostic notation', () => {
    expect(toDiagnostic(100)).toBe('100')
    expect(toDiagnostic('hello')).toBe('"hello"')
    expect(toDiagnostic([1, 2, 3])).toBe('[1, 2, 3]')
    expect(toDiagnostic(true)).toBe('true')
    expect(toDiagnostic(null)).toBe('null')
  })

  it('toDiagnostic() should handle tagged values', () => {
    const result = toDiagnostic({ tag: 121, value: [] })
    expect(result).toBe('121([])')
  })

  it('decodeToDiagnostic() should decode and convert in one step', () => {
    expect(decodeToDiagnostic('1864')).toBe('100')
    expect(decodeToDiagnostic('83010203')).toBe('[1, 2, 3]')
    expect(decodeToDiagnostic('d87980')).toBe('121([])')
  })
})

describe('Public API - CborDecoder Class', () => {
  it('should create decoder with default options', () => {
    const decoder = new CborDecoder()
    const result = decoder.decode('1864')
    expect(result.value).toBe(100)
  })

  it('should create decoder with custom options', () => {
    const decoder = new CborDecoder({ strict: true })
    const result = decoder.decode('1864')
    expect(result.value).toBe(100)
  })

  it('should decode with source map', () => {
    const decoder = new CborDecoder()
    const result = decoder.decodeWithSourceMap('d87980')
    expect(result.value).toMatchObject({ tag: 121, value: [] })
    expect(result.sourceMap).toBeDefined()
  })
})

describe('Public API - CborEncoder Class', () => {
  it('should create encoder with default options', () => {
    const encoder = new CborEncoder()
    const result = encoder.encode(100)
    expect(result.hex).toBe('1864')
  })

  it('should create encoder with custom options', () => {
    const encoder = new CborEncoder({ canonical: true })
    const result = encoder.encode({ z: 1, a: 2 })
    expect(result.hex).toBeDefined()
  })

  it('should encode to hex', () => {
    const encoder = new CborEncoder()
    const hex = encoder.encodeToHex(100)
    expect(hex).toBe('1864')
  })

  it('should encode to bytes', () => {
    const encoder = new CborEncoder()
    const bytes = encoder.encodeToBytes(100)
    expect(bytes).toEqual(new Uint8Array([0x18, 0x64]))
  })

  it('should encode sequence', () => {
    const encoder = new CborEncoder()
    const result = encoder.encodeSequence([1, 2, 3])
    expect(result.hex).toBe('010203')
  })
})

describe('Public API - Composables', () => {
  it('useCborParser should be exported', () => {
    const parser = useCborParser()
    expect(parser.parse).toBeDefined()
    expect(parser.parseWithSourceMap).toBeDefined()
  })

  it('useCborEncoder should be exported', () => {
    const encoder = useCborEncoder()
    expect(encoder.encode).toBeDefined()
    expect(encoder.encodeToHex).toBeDefined()
  })

  it('useCborInteger should be exported', () => {
    const integer = useCborInteger()
    expect(integer.parseInteger).toBeDefined()
  })

  it('useCborString should be exported', () => {
    const string = useCborString()
    expect(string.parseByteString).toBeDefined()
    expect(string.parseTextString).toBeDefined()
  })

  it('useCborCollection should be exported', () => {
    const collection = useCborCollection()
    expect(collection.parseArray).toBeDefined()
    expect(collection.parseMap).toBeDefined()
  })

  it('useCborFloat should be exported', () => {
    const float = useCborFloat()
    expect(float.parseFloat).toBeDefined()
  })

  it('useCborTag should be exported', () => {
    const tag = useCborTag()
    expect(tag.parseTag).toBeDefined()
  })

  it('useCborDiagnostic should be exported', () => {
    const diagnostic = useCborDiagnostic()
    expect(diagnostic.toDiagnostic).toBeDefined()
  })

  it('useCborIntegerEncoder should be exported', () => {
    const encoder = useCborIntegerEncoder()
    expect(encoder.encodeInteger).toBeDefined()
  })

  it('useCborStringEncoder should be exported', () => {
    const encoder = useCborStringEncoder()
    expect(encoder.encodeTextString).toBeDefined()
    expect(encoder.encodeByteString).toBeDefined()
  })

  it('useCborCollectionEncoder should be exported', () => {
    const encoder = useCborCollectionEncoder()
    expect(encoder.encodeArray).toBeDefined()
    expect(encoder.encodeMap).toBeDefined()
  })

  it('useCborSimpleEncoder should be exported', () => {
    const encoder = useCborSimpleEncoder()
    expect(encoder.encodeSimple).toBeDefined()
    expect(encoder.encodeFloat).toBeDefined()
  })
})

describe('Public API - Utilities', () => {
  it('PathBuilder should be exported', () => {
    expect(PathBuilder).toBeDefined()
    expect(PathBuilder.root()).toBe('')
    expect(PathBuilder.arrayIndex('', 0)).toBe('[0]')
    expect(PathBuilder.mapKey('', 'a')).toBe('.a')
  })
})

describe('Public API - Constants and Enums', () => {
  it('DEFAULT_OPTIONS should be exported', () => {
    expect(DEFAULT_OPTIONS).toBeDefined()
    expect(DEFAULT_OPTIONS.strict).toBe(false)
  })

  it('DEFAULT_LIMITS should be exported', () => {
    expect(DEFAULT_LIMITS).toBeDefined()
    expect(DEFAULT_LIMITS.maxDepth).toBeDefined()
  })

  it('DEFAULT_ENCODE_OPTIONS should be exported', () => {
    expect(DEFAULT_ENCODE_OPTIONS).toBeDefined()
    expect(DEFAULT_ENCODE_OPTIONS.canonical).toBe(false)
  })

  it('CborMajorType enum should be exported', () => {
    expect(CborMajorType.UNSIGNED_INT).toBe(0)
    expect(CborMajorType.NEGATIVE_INT).toBe(1)
    expect(CborMajorType.BYTE_STRING).toBe(2)
    expect(CborMajorType.TEXT_STRING).toBe(3)
    expect(CborMajorType.ARRAY).toBe(4)
    expect(CborMajorType.MAP).toBe(5)
    expect(CborMajorType.TAG).toBe(6)
    expect(CborMajorType.SIMPLE).toBe(7)
  })

  it('CborAdditionalInfo enum should be exported', () => {
    expect(CborAdditionalInfo.DIRECT).toBe(23)
    expect(CborAdditionalInfo.ONE_BYTE).toBe(24)
    expect(CborAdditionalInfo.INDEFINITE).toBe(31)
  })

  it('CborSimpleValue enum should be exported', () => {
    expect(CborSimpleValue.FALSE).toBe(20)
    expect(CborSimpleValue.TRUE).toBe(21)
    expect(CborSimpleValue.NULL).toBe(22)
    expect(CborSimpleValue.UNDEFINED).toBe(23)
  })

  it('CborTag enum should be exported', () => {
    expect(CborTag.DATE_TIME_STRING).toBe(0)
    expect(CborTag.EPOCH_DATE_TIME).toBe(1)
    expect(CborTag.POSITIVE_BIGNUM).toBe(2)
    expect(CborTag.NEGATIVE_BIGNUM).toBe(3)
  })
})
