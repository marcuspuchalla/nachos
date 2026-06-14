# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-14 - RFC 8949 audit remediation

Resolves the findings of the June 2026 RFC 8949 conformance & security audit.
All fixes verified empirically against the build and locked in by
`src/__tests__/audit-fixes.test.ts`.

### Fixed

#### Security
- **(H1) Source-map parse path stack overflow** - `decodeWithSourceMap()` now
  enforces `maxTagDepth` (RUSTSEC-2019-0025). Deeply nested tags previously
  overflowed the call stack with an uncatchable `RangeError`; they now raise a
  clean `Error`, matching `decode()`.
- **(M2) Encoder depth bypass via tags** - `maxDepth` is now tracked across the
  tagged-value boundary, so deeply nested `{tag,value}` chains can no longer
  bypass the limit and overflow the stack.
- **(L3) `readUint` precision** - refuses values above `MAX_SAFE_INTEGER`
  instead of silently losing precision; callers must use `readBigUint`.

#### Correctness / Conformance
- **(H2) Map key ordering is now explicit** - canonical mode defaults to
  **length-first** ordering (Cardano CIP-21 / RFC 7049 §3.9) and accepts a new
  `mapKeyOrder: 'length-first' | 'bytewise'` option. `'bytewise'` selects
  RFC 8949 §4.2.1 core deterministic ordering. Applies to both encoding and
  `validateCanonical` decoding.
- **(M1) Trailing-data well-formedness** - new `allowTrailingData` option
  (default `true`; auto-`false` in `strict` mode) makes `decode()` reject
  bytes left over after the top-level item. Use `parseSequence` for multiple items.
- **(M4) Shortest-form tag numbers** - `validateCanonical` now rejects
  non-shortest tag number encodings (e.g. `d80100` instead of `c100`).
- **(M5) Float16 subnormal encoding** - `canBeFloat16` lower bound corrected
  from 2⁻¹⁴ (min normal) to 2⁻²⁴ (min subnormal). The encoder no longer emits
  float32 for representable subnormals, so its output again passes its own
  canonical validator.

#### Behavior
- **(M3) Duplicate map keys** - default `dupMapKeyMode` changed from `'allow'`
  to `'warn'` so duplicates are never silently collapsed in the `Map` view.
  Byte-perfect round-trips are still preserved via `ALL_ENTRIES_SYMBOL`.

### Performance
- **(L1) Source-map sequences** - `parseSequenceWithSourceMap` uses a zero-copy
  `subarray` view per item instead of re-hex-encoding the buffer tail (O(N²) → O(N)).

### Added
- `MapKeyOrder` type, `mapKeyOrder` option (parser + encoder), `allowTrailingData`
  option, and `compareBytesLexicographic` / `compareMapKeys` utilities.
- Diagnostic notation (L5) now renders `CborByteString`/`CborTextString` wrappers,
  unassigned simple values (`simple(N)`), and auto-detects indefinite-length
  arrays/maps/strings.
- 24 new audit-regression tests.

## [0.1.4] - 2026-02-22

### Fixed

#### Security
- **Duplicate map key bypass** - Semantic comparison now used for duplicate detection; different encodings of the same integer key (e.g. `0x01`, `0x1801`, `0x190001`) are correctly identified as duplicates (RFC 8949 Section 5.6)
- **maxParseTime bypass** - Timeout is now enforced in standard `decode()`/`parse()` path, not only in `decodeWithSourceMap()`
- **bytesWritten double-counting** - Removed broken value-copy tracking from `EncodeContext`; `maxOutputSize` is now checked once at root level after encoding completes

#### Correctness
- **Tag 4/5 integer validation** - `Number.isInteger()` check added to reject floats in exponent/mantissa positions (RFC 8949 requirement)
- **Float16 IEEE 754 rounding** - Replaced truncating `>> 42` shift with guard/round/sticky round-half-to-even; also fixed 32-bit truncation bug that corrupted most float16 mantissas
- **Exponential source-map re-parsing** - `validateTagSemantics` and `decodePlutusConstructor` now called directly on already-parsed values instead of re-parsing the entire tag subtree (O(D²) → O(D))

### Performance
- **Eliminated O(N²) parsing** - `parseItem` and `parseSequence` no longer slice and hex-encode the full remaining buffer on each element; all types now use buffer+offset native dispatch
- **Map canonical sort** - Keys pre-encoded once before sort instead of re-encoded O(N log N) times inside comparator

### Added
- **Uint8Array input support** - `decode()`, `decodeWithSourceMap()`, `parseSequence()`, and `CborDecoder` class methods now accept `Uint8Array` directly, skipping hex conversion entirely
- **Buffer-native parser exports** - `parseIntegerFromBuffer`, `parseFromBuffer` (float), `parseTagFromBuffer`, `validateTagSemantics`, `decodePlutusConstructor` exported for advanced use
- 115 new tests

## [0.1.3] - 2026-02-09

### Fixed

#### Critical Bugs
- **Float parser ReferenceError** - `options` variable was not accessible in float parsing, causing 29 test failures
- **Missing CborByteString import** - Tag parser failed when decoding byte-string tagged values
- **Float16 subnormal encoding** - Mantissa bits were being lost for subnormal half-precision floats

#### Security Hardening
- **Tag parser internal security checks** - Added depth, array length, map size, and indefinite-length validation to tag-internal array/map parsing
- **String encoder pre-allocation check** - Size validation now happens before buffer allocation (DoS prevention)
- **Default nesting limits** - Updated default `maxDepth` and `maxTagDepth` to 100 (was hardcoded as 64)
- **Replaced magic numbers** - All hardcoded limit values now use `DEFAULT_LIMITS` constants

#### RFC 8949 Compliance
- **Canonical NaN validation** - Float32/float64 NaN payloads are now validated in canonical mode
- **Canonical shortest-form float validation** - Values that fit in float16 are rejected in float32/float64 canonical mode
- **Indefinite-length chunk validation** - String chunks inside indefinite-length strings must be definite-length per RFC 3.2.3
- **Canonical + indefinite conflict** - Auto-resolves `canonical: true` with `allowIndefinite: true` instead of silently misbehaving

### Added

#### Tests
- 91 round-trip encode/decode tests covering all CBOR major types
- 70 encoder error handling and canonical encoding tests
- Total test count increased from 1038 to 1199

### Removed
- Stale Emacs backup file
- Commented-out dead code in parser

## [0.1.0] - 2025-12-01

### Added

#### Core Features
- **RFC 8949 compliant CBOR decoder** - Full implementation of all major types (0-7)
- **RFC 8949 compliant CBOR encoder** - Roundtrip encoding/decoding support
- **Source map generation** - Bidirectional hex-to-JSON linking for debugging
- **Cardano blockchain support** - Plutus constructor tags (121-127, 1280-1400, 102)
- **Zero runtime dependencies** - Pure TypeScript implementation

#### CBOR Types Supported
- **Major Type 0**: Unsigned integers (0 to 2^64-1)
- **Major Type 1**: Negative integers (-1 to -2^64)
- **Major Type 2**: Byte strings (definite and indefinite length)
- **Major Type 3**: Text strings with UTF-8 validation
- **Major Type 4**: Arrays (definite and indefinite length)
- **Major Type 5**: Maps with various key types
- **Major Type 6**: Tagged values (standard and Cardano-specific)
- **Major Type 7**: Floats (16/32/64-bit), booleans, null, undefined

#### Security Features
- DoS protection with configurable limits
- Maximum input size (default: 10MB)
- Maximum nesting depth (default: 64)
- Maximum parse time (default: 1000ms)
- Tag depth limiting (RUSTSEC-2019-0025 mitigation)
- Bignum size limiting (CVE-2020-28491 mitigation)

#### Encoding Features
- Canonical/deterministic encoding (RFC 8949 Section 4.2.1)
- Indefinite-length encoding option
- Map key type preservation during roundtrip
- Integer key detection for Cardano metadata

#### API
- Functional API: `decode()`, `encode()`, `decodeWithSourceMap()`
- Class API: `CborDecoder`, `CborEncoder`
- Tree-shakeable exports via subpaths
- Full TypeScript type definitions

#### Testing
- 99.4% test coverage
- 83 RFC 8949 Appendix A test vectors
- Real-world Cardano transaction tests
- Security/DoS protection tests

### Known Limitations
- No streaming API for large files (planned for v1.0)
- Source map generation doubles memory usage
- No Web Worker wrapper (planned for v1.0)

---

## Version History

- **0.1.0** - Initial release with full CBOR support and Cardano integration
