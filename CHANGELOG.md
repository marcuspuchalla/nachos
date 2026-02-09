# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
