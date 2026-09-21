# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-21 - July and September audit repairs

Repairs the audited core parsing, encoding and Cardano-helper defects. Optional application protocols remain separately scoped. July regressions are recorded in
`src/__tests__/audit-2026-07.test.ts` and
`src/cardano/__tests__/cardano-audit-2026-07.test.ts`.

### Roadmap completion

- Bound temporary hexadecimal-conversion allocations for large wire values and cache successful CDDL schema diagnostics; pinned CIP-21 schemas are checked in the suite before use.
- Add bounded incremental sequence framing, exact RFC 9581 semantic helpers and RFC 9164 address/prefix/interface validation.
- Add opt-in CDDL validation with a pinned, reproducible WASM backend; repair upstream integer, map-key, recursion, tag-unwrapping, float and embedded-sequence cases found by regression tests.
- Validate CIP-21 against pinned Conway ledger CDDL plus serialization, collection, set-tag, certificate, pool, governance and Catalyst restrictions.
- Verify COSE Sign1 and multi-signer Sign using trusted Web Crypto keys, including protected headers, critical extensions, detached payloads, external AAD and RFC 9864 algorithm identifiers.
- Stop misclassifying standalone Babbage outputs as transaction bodies; unwrap Conway certificate sets during era detection.

### September repairs

- One bounded scanner now drives normal decode, byte inputs, source maps and sequences. Missing breaks, BOM loss, option divergence, structural duplicate-key collisions and mixed collection/tag depth bypasses are fixed.
- Correct shortest-float checks, including exhaustive finite binary16 coverage; wire-aware integer/float keys and NaN sign/payload comparisons follow RFC 8949 and verified erratum 8589.
- Validate tag content before conversion; correct embedded CBOR, calendar/base64, bignum limits, uint64 tag numbers and recursive Plutus data checks.
- Fix canonical map ordering with preserved entries, decoded simple values, indefinite normalization and encoder allocation/depth budgets.
- Add lossless wire nodes, typed JSON transport, wire diagnostics, explicit validity profiles and optional registered-tag helpers.
- Correct Shelley transaction metadata position, Conway witness-set wrappers and Plutus constructor labels/indices.
- Preserve tag 1 non-finite timestamp values in the core validity policy: RFC 8949 §3.4.2 leaves their application interpretation open. The initial audit assumption requiring rejection was corrected.

### Fixed

#### Correctness (P0)
- **`undefined` in collections encoded as null** - `encode([undefined])`
  previously produced `81f6` (null); it now correctly produces `81f7`
  everywhere (arrays, map values, nested structures). Top-level
  `encode(undefined)` was already correct.
- **CIP-25 parser broken against real decoder output** - `useCip25Parser` used
  bracket access and `for...in` on structures the base decoder returns as
  `Map` instances, so `extractCip25FromCbor(decode(...))` was always null.
  The parser is now Map-aware at every level (label 721 as integer or string
  key, policy/asset maps, files arrays) and supports byte-string keys/values
  (CIP-25 v2). `useCardanoHelpers.parseCIP25Metadata` now delegates to the
  single fixed implementation and returns a `Cip25ParseResult` (was: raw map).
- **Bignum encode asymmetry** - the decoder produced BigInt beyond ±2^64 from
  tags 2/3, but the encoder threw. Bigints outside the 64-bit range now encode
  automatically as tag 2/3 with minimal-length big-endian content (no leading
  zeros); decoded `{ tag: 2|3, value: BigInt }` wrappers re-encode to the
  original bytes. Bigints that fit in 64 bits still use major type 0/1.
  New `maxBignumBytes` encoder option (default 1024, mirrors parser limit).
- **Encoder/parser depth asymmetry** - the encoder's default `maxDepth` was 64
  while the parser's is 100, so values the parser decoded could fail to
  re-encode. Encoder default is now 100.
- **Residual O(N²) in `parseSequence`** - `dispatchFromBuffer` re-hexed the
  entire remaining buffer for every container item (major types 4/5/6). It now
  parses arrays, maps, and tags buffer-natively.
- **Weaker validation for containers nested under tags** - `useCborTag` had
  internal array/map parser copies that skipped canonical key-order
  validation, `dupMapKeyMode` handling, and `ALL_ENTRIES_SYMBOL` round-trip
  preservation. Tagged containers now route through the same
  `useCborCollection` logic as top-level containers. (Error messages for
  reserved additional-info values inside tags are now the unified
  `Invalid additional info: N` form.)

#### Cardano layer
- **Pointer addresses misclassified** - address header types 4/5 were
  reported as `enterprise` and their pointer data discarded. They are now
  `type: 'pointer'` with the CIP-19 variable-length nat pointer parsed and
  exposed (`stakeCredential: { type: 'pointer', slot, txIndex, certIndex }`).
  Enterprise is types 6/7; base-address stake handling (0-3) unchanged.
- **Byron era false-positive** - any `[0|1, x]` two-element array was
  detected as Byron with high confidence. Byron structural evidence (tag-24
  CBOR-in-CBOR wrapper, bootstrap-address bytes, header-sized byte strings)
  is now required for the high-confidence marker; a bare `[0|1, container]`
  yields only low confidence, and `[0|1, scalar]` is `unknown`.
- **Missing Alonzo markers** - transaction-body fields 14 (required_signers,
  incl. tag-258 wrapped) and 15 (network_id) now emit Alonzo era markers.
- **Tag-258 sets not unwrapped** - `parseTransactionBody` now unwraps
  tag-258 (set) wrappers for inputs, certificates, collateral, required
  signers, reference inputs, and proposal procedures (Conway).
- **Raw base-parser errors** - `useCardanoCborDecoder.decode` now wraps parse
  failures with Cardano context (input size, byte offset when reported) while
  preserving the original message and error as `cause`.

### Added

#### RFC 8949 completeness
- **Tag 55799 self-described CBOR** - `encodeSelfDescribed(value)` /
  `encode(value, { selfDescribed: true })` prefix the output with `d9d9f7`;
  `decode(input, { unwrapSelfDescribed: true })` transparently unwraps a
  top-level tag 55799 (default: false, tag preserved).
- **Tags 21-23 (expected later encodings)** - decode remains pass-through
  `{ tag, value }` (documented); new `useCborTag().applyExpectedEncoding()`
  helper converts byte-string content to the promised base64url / base64 /
  base16 string form for diagnostic purposes.
- **Tag 32-36 semantic validation** - under `validateTagSemantics`, tags
  33/34 now also validate the base64url/base64 alphabet of their content
  (32/35/36 text+URI checks already existed and are covered by tests).
- **`fromDiagnostic`** - diagnostic-notation parser for the documented supported forms
  (integers incl. bigints and 0x hex, floats incl. Infinity/-Infinity/NaN and
  `_N` width suffixes, strings with escapes, `h'…'`/`b64'…'` byte strings,
  arrays, maps → `Map`, tagged values `n(…)`, `simple(n)`,
  true/false/null/undefined, indefinite forms `[_ …]`/`{_ …}`/`(_ …)`,
  arbitrary nesting, whitespace tolerance). Exported publicly as
  `fromDiagnostic`.
- **`DiagnosticOptions.showOffsets` wired** - `decodeToDiagnostic(hex,
  { showOffsets: true })` decodes with a source map and annotates every value
  with its byte span (e.g. `[1 /* 1-2 */] /* 0-2 */`) via the new
  `toDiagnosticWithOffsets`.
- **CIP-25 `files[].mediaType` validation** - lenient MIME-shape check;
  issues are reported in the new `warnings` array of `Cip25ParseResult` /
  `Cip25ValidationResult` (never an error).

### Changed
- `DEFAULT_ENCODE_OPTIONS.maxDepth`: 64 → 100 (parser parity).
- `Cip25ParseResult` / `Cip25ValidationResult` gained a `warnings: string[]`
  field; `useCardanoHelpers.parseCIP25Metadata(hex)` now returns a
  `Cip25ParseResult` instead of the raw label-721 map.
- README: ParseOptions/EncodeOptions tables corrected (parser `maxDepth`
  default is 100; `rejectDuplicateKeys` is encoder-only — the parser uses
  `dupMapKeyMode`; added the previously undocumented options), map-decode
  examples now show `Map` output, and canonical ordering is documented as
  length-first (RFC 7049 §3.9 / CIP-21) with `mapKeyOrder: 'bytewise'` opt-in.

## [0.3.0] - 2026-07-01 - Cardano application layer

### Added

- Added Cardano application layer (era detection, Cardano CBOR decoder with
  source maps, CIP-25 NFT metadata parser, Cardano helpers) consolidated from
  the cbor.app fork. The layer lives under `src/cardano/` and is built on top of
  the existing RFC 8949 base parser/encoder rather than duplicating it.
  - `useCardanoEraDetector` - detects the Cardano era (Byron → Conway) from
    transaction structure, certificates, scripts, and addresses.
  - `useCardanoCborDecoder` - decodes CBOR with enhanced, human-readable source
    maps and Cardano-specific interpretations (lovelace amounts, key hashes,
    addresses, sets, Plutus tags).
  - `useCip25Parser` - parses and validates CIP-25 NFT metadata (label 721).
  - `useCardanoHelpers` - parses Cardano addresses, transactions, witness sets,
    and Plutus data.
  - Era types and tables (`CardanoEra`, `ERA_INFO`, `TRANSACTION_BODY_FIELDS`,
    `CERTIFICATE_TYPE_INDICES`, `compareEras`, `getMinimumEra`, …) exported from
    the package entry point.

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
