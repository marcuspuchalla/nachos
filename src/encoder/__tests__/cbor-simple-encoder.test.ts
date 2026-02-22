/**
 * CBOR Simple Values and Floats Encoder Test Suite
 * Tests for Major Type 7 (Floats and Simple Values)
 */

import { describe, it, expect } from 'vitest'
import { useCborSimpleEncoder } from '../composables/useCborSimpleEncoder'

describe('CBOR Simple Values and Floats Encoder', () => {
  describe('Simple Values', () => {
    it('should encode false', () => {
      const { encodeSimple } = useCborSimpleEncoder()
      const result = encodeSimple(false)

      expect(result.bytes).toEqual(new Uint8Array([0xf4]))
      expect(result.hex).toBe('f4')
    })

    it('should encode true', () => {
      const { encodeSimple } = useCborSimpleEncoder()
      const result = encodeSimple(true)

      expect(result.bytes).toEqual(new Uint8Array([0xf5]))
      expect(result.hex).toBe('f5')
    })

    it('should encode null', () => {
      const { encodeSimple } = useCborSimpleEncoder()
      const result = encodeSimple(null)

      expect(result.bytes).toEqual(new Uint8Array([0xf6]))
      expect(result.hex).toBe('f6')
    })

    it('should encode undefined', () => {
      const { encodeSimple } = useCborSimpleEncoder()
      const result = encodeSimple(undefined)

      expect(result.bytes).toEqual(new Uint8Array([0xf7]))
      expect(result.hex).toBe('f7')
    })
  })

  describe('Floating-Point Numbers', () => {
    describe('Float16 (half precision)', () => {
      it('should encode 0.0 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(0.0, 16)

        // 0xf9 (float16) + 0x0000
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x00, 0x00]))
        expect(result.hex).toBe('f90000')
      })

      it('should encode 1.0 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.0, 16)

        // 0xf9 (float16) + 0x3c00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3c, 0x00]))
        expect(result.hex).toBe('f93c00')
      })

      it('should encode -1.0 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(-1.0, 16)

        // 0xf9 (float16) + 0xbc00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0xbc, 0x00]))
        expect(result.hex).toBe('f9bc00')
      })

      it('should encode Infinity as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(Infinity, 16)

        // 0xf9 (float16) + 0x7c00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x7c, 0x00]))
        expect(result.hex).toBe('f97c00')
      })

      it('should encode -Infinity as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(-Infinity, 16)

        // 0xf9 (float16) + 0xfc00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0xfc, 0x00]))
        expect(result.hex).toBe('f9fc00')
      })

      it('should encode NaN as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(NaN, 16)

        // 0xf9 (float16) + 0x7e00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x7e, 0x00]))
        expect(result.hex).toBe('f97e00')
      })

      it('should encode 1.5 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.5, 16)

        // 1.5 = 0 01111 1000000000 = 0x3e00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3e, 0x00]))
        expect(result.hex).toBe('f93e00')
      })

      it('should encode -2.0 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(-2.0, 16)

        // -2.0 = 1 10000 0000000000 = 0xc000
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0xc0, 0x00]))
        expect(result.hex).toBe('f9c000')
      })

      it('should encode 0.5 as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(0.5, 16)

        // 0.5 = 0 01110 0000000000 = 0x3800
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x38, 0x00]))
        expect(result.hex).toBe('f93800')
      })

      it('should encode 65504 (max finite float16) as float16', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(65504, 16)

        // 65504 = 0 11110 1111111111 = 0x7bff
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x7b, 0xff]))
        expect(result.hex).toBe('f97bff')
      })
    })

    describe('Float16 IEEE 754 round-half-to-even', () => {
      // Helper to construct a float64 value from raw mantissa bits
      // exp64=0 means biased exponent=1023, so the value is 1.mantissa
      function makeFloat64(exp64: number, mant64: number, sign = 0): number {
        const biasedExp = BigInt(exp64 + 1023)
        const bits = (BigInt(sign) << 63n) | (biasedExp << 52n) | BigInt(mant64)
        const buf = new ArrayBuffer(8)
        const view = new DataView(buf)
        view.setBigUint64(0, bits, false)
        return view.getFloat64(0, false)
      }

      it('should round down at midpoint when truncated mantissa is even (round-half-to-even)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: mant16_truncated=256 (even), guard=1, round=0, sticky=0
        // mant64 = (256 << 42) | (1 << 41)
        const mant64 = 256 * Math.pow(2, 42) + Math.pow(2, 41)
        const value = makeFloat64(0, mant64)
        const result = encodeFloat(value, 16)

        // Should round DOWN to mant16=256 (even), exp16=15
        // float16 = 0 01111 0100000000 = 0x3d00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3d, 0x00]))
      })

      it('should round up at midpoint when truncated mantissa is odd (round-half-to-even)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: mant16_truncated=257 (odd), guard=1, round=0, sticky=0
        const mant64 = 257 * Math.pow(2, 42) + Math.pow(2, 41)
        const value = makeFloat64(0, mant64)
        const result = encodeFloat(value, 16)

        // Should round UP to mant16=258 (even), exp16=15
        // float16 = 0 01111 0100000010 = 0x3d02
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3d, 0x02]))
      })

      it('should round up when above midpoint (guard=1, sticky bits set)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: mant16_truncated=256 (even), guard=1, sticky=1 -> above midpoint
        const mant64 = 256 * Math.pow(2, 42) + Math.pow(2, 41) + 1
        const value = makeFloat64(0, mant64)
        const result = encodeFloat(value, 16)

        // Should round UP to mant16=257, exp16=15
        // float16 = 0 01111 0100000001 = 0x3d01
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3d, 0x01]))
      })

      it('should truncate when below midpoint (guard=0)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: mant16_truncated=256, guard=0, some lower bits set
        // mant64 = (256 << 42) | (1 << 40) -- only round bit, no guard
        const mant64 = 256 * Math.pow(2, 42) + Math.pow(2, 40)
        const value = makeFloat64(0, mant64)
        const result = encodeFloat(value, 16)

        // Should truncate to mant16=256, exp16=15
        // float16 = 0 01111 0100000000 = 0x3d00
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x3d, 0x00]))
      })

      it('should handle mantissa overflow from rounding (bump exponent)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: mant16_truncated=0x3FF (1023, odd), guard=1, sticky=1
        // Rounding up gives 0x400, which overflows 10-bit mantissa
        // Should become mant16=0, exp16+1
        const mant64 = 0x3FF * Math.pow(2, 42) + Math.pow(2, 41) + 1
        const value = makeFloat64(0, mant64)
        const result = encodeFloat(value, 16)

        // Mantissa overflows: exp16 bumps from 15 to 16, mant16=0
        // float16 = 0 10000 0000000000 = 0x4000 = 2.0
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x40, 0x00]))
      })

      it('should handle mantissa overflow to infinity at max exponent', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        // Construct: exp64=15 (exp16=30, max normal), mant16_truncated=0x3FF, guard=1, sticky=1
        // Rounding overflows mantissa, bumps exp16 to 31 = infinity
        const mant64 = 0x3FF * Math.pow(2, 42) + Math.pow(2, 41) + 1
        const value = makeFloat64(15, mant64)
        const result = encodeFloat(value, 16)

        // exp16=30 + overflow = 31 (infinity), mant16=0
        // float16 = 0 11111 0000000000 = 0x7c00 = +Infinity
        expect(result.bytes).toEqual(new Uint8Array([0xf9, 0x7c, 0x00]))
      })
    })

    describe('Float32 (single precision)', () => {
      it('should encode 0.0 as float32', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(0.0, 32)

        // 0xfa (float32) + 0x00000000
        expect(result.bytes).toEqual(new Uint8Array([0xfa, 0x00, 0x00, 0x00, 0x00]))
        expect(result.hex).toBe('fa00000000')
      })

      it('should encode 1.0 as float32', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.0, 32)

        // 0xfa (float32) + 0x3f800000
        expect(result.bytes).toEqual(new Uint8Array([0xfa, 0x3f, 0x80, 0x00, 0x00]))
        expect(result.hex).toBe('fa3f800000')
      })

      it('should encode 3.4028234663852886e+38 (max float32)', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(3.4028234663852886e+38, 32)

        // 0xfa (float32) + 0x7f7fffff
        expect(result.bytes).toEqual(new Uint8Array([0xfa, 0x7f, 0x7f, 0xff, 0xff]))
        expect(result.hex).toBe('fa7f7fffff')
      })

      it('should encode Infinity as float32', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(Infinity, 32)

        // 0xfa (float32) + 0x7f800000
        expect(result.bytes).toEqual(new Uint8Array([0xfa, 0x7f, 0x80, 0x00, 0x00]))
        expect(result.hex).toBe('fa7f800000')
      })
    })

    describe('Float64 (double precision)', () => {
      it('should encode 0.0 as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(0.0, 64)

        // 0xfb (float64) + 0x0000000000000000
        expect(result.bytes).toEqual(new Uint8Array([0xfb, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
        expect(result.hex).toBe('fb0000000000000000')
      })

      it('should encode 1.1 as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.1, 64)

        // RFC 8949 Appendix A example
        expect(result.bytes).toEqual(new Uint8Array([0xfb, 0x3f, 0xf1, 0x99, 0x99, 0x99, 0x99, 0x99, 0x9a]))
        expect(result.hex).toBe('fb3ff199999999999a')
      })

      it('should encode 1.0e+300 as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.0e+300, 64)

        // RFC 8949 Appendix A example
        expect(result.bytes).toEqual(new Uint8Array([0xfb, 0x7e, 0x37, 0xe4, 0x3c, 0x88, 0x00, 0x75, 0x9c]))
        expect(result.hex).toBe('fb7e37e43c8800759c')
      })

      it('should encode -4.1 as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(-4.1, 64)

        // RFC 8949 Appendix A example
        expect(result.bytes).toEqual(new Uint8Array([0xfb, 0xc0, 0x10, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66]))
        expect(result.hex).toBe('fbc010666666666666')
      })

      it('should encode Infinity as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(Infinity, 64)

        // 0xfb (float64) + 0x7ff0000000000000
        expect(result.bytes).toEqual(new Uint8Array([0xfb, 0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
        expect(result.hex).toBe('fb7ff0000000000000')
      })

      it('should encode NaN as float64', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(NaN, 64)

        // 0xfb (float64) + NaN representation
        expect(result.bytes[0]).toBe(0xfb)
        expect(result.bytes.length).toBe(9)
      })
    })

    describe('Auto-detect precision', () => {
      it('should encode integer-like float as integer', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(100.0)

        // Should use integer encoding if possible
        // This is an optimization - float64 is also acceptable
        expect(result.bytes[0]).toBe(0x18)  // Integer encoding
        expect(result.bytes[1]).toBe(100)
      })

      it('should encode fractional number as smallest float', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.5)

        // 1.5 can be represented in float16, float32, or float64
        // Any of these are acceptable
        expect([0xf9, 0xfa, 0xfb]).toContain(result.bytes[0])  // Float16, Float32, or Float64
      })

      it('should use float64 for high-precision numbers', () => {
        const { encodeFloat } = useCborSimpleEncoder()
        const result = encodeFloat(1.1)

        // 1.1 requires float64 for precision
        expect(result.bytes[0]).toBe(0xfb)  // Float64
      })
    })
  })
})
