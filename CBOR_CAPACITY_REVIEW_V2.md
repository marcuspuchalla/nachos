# CBOR Encoding/Decoding Quality Review - V2

Date: 2025-12-19
Scope: CBOR encoding/decoding quality vs global CBOR specs (RFC 8949, RFC 8742)
Method: Static review of current implementation plus targeted tests

## Executive Summary

The library largely follows RFC 8949 and RFC 8742, with strong coverage for major types, canonical encoding, and security limits. The most significant remaining gaps are in canonical NaN payload enforcement (float16), optional encoder behaviors (`allowIndefinite`, `rejectDuplicateKeys`), and tag 2/3 type strictness. These are compliance/quality issues rather than critical security flaws.

## Spec Coverage Assessment

### RFC 8949 (CBOR)

- Major types 0-7: Implemented
- Indefinite-length items: Implemented with strict/canonical enforcement
- Deterministic encoding (Section 4.2.1): Mostly implemented
  - Shortest integer/length encoding: Implemented
  - Canonical map key ordering: Implemented in encoder and parser validation
  - Float minimal encoding: Implemented (float16/32/64 size checks)
  - NaN canonical encoding: Partial (float16 NaN payload not enforced)
- UTF-8 validation (strict): Implemented
- Tags: Broad support + configurable semantics checks

### RFC 8742 (CBOR Sequences)

- Sequence parsing and encoding: Implemented
- Break marker handling outside indefinite context: Implemented

## Key Findings

### 1) Canonical NaN payload for float16 not enforced (Medium)

Deterministic encoding requires a single canonical NaN encoding (0xf97e00). The parser accepts any float16 NaN payload when `validateCanonical` is enabled. This is a spec compliance gap for strict deterministic encoding.

### 2) Encoder options are partially ignored (Medium)

- `allowIndefinite: false` is not enforced in the encoder. Arrays/maps marked as indefinite or explicitly requested as indefinite can still encode as such when `allowIndefinite` is false.
- `rejectDuplicateKeys` is not enforced in the encoder, especially for `ALL_ENTRIES_SYMBOL` usage.

### 3) Tag 2/3 type strictness (Low/Medium)

RFC 8949 expects tag 2/3 values to be byte strings. The parser converts `Uint8Array` and `CborByteString` but does not error for other types when tag semantics are not explicitly validated. This can allow non-byte content to pass silently.

## Positive Notes

- Resource limits are consistently applied in standard and source-map parsing paths.
- Canonical float size validation is implemented for float32/float64.
- Duplicate key detection now uses raw key bytes, avoiding JS string collisions.
- `-0` is preserved via float encoding.

## Recommendations

1) Enforce canonical NaN payload for float16 in `validateCanonical` mode.
2) Enforce `allowIndefinite` and `rejectDuplicateKeys` in encoder entry points.
3) Add optional strict validation for tag 2/3 to require byte strings when enabled.
