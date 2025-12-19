# Seaborne (CBOR) Encoding/Decoding Quality Review

Date: 2025-12-19
Scope: End-to-end CBOR encoding/decoding capacity and quality review for NACHOS
Assumption: "seaborne" refers to CBOR encoding/decoding quality and capacity.

## Expert Panel Summary

- RFC 8949 Compliance Reviewer: Focused on deterministic encoding, canonical rules, and tag semantics.
- Security Reviewer: Focused on DoS resistance, limits, and input validation.
- Interoperability Reviewer: Focused on round-trip behavior, canonical consistency, and edge cases.

Overall assessment: Strong baseline implementation with clear structure and extensive tests. Main quality risks concentrate in paths that bypass limits/canonical rules and in float/-0 handling consistency. Addressing the items in the implementation plan brings the library to high confidence for production-grade CBOR workloads.

## Findings

### Strengths

- Comprehensive major-type coverage (0-7) with clear composable structure.
- Configurable strictness: canonical validation, UTF-8 strict validation, tag semantics, and Plutus semantics.
- Defensive limits for depth, sizes, and parsing time (in main parse paths).
- Canonical map ordering for encoding and validation in collection parser.
- Good handling of RFC 8949 test vectors and a large test suite.

### Gaps and Risks

1) Limit enforcement gaps in source-map parsing
- Impact: Source-map parsing can bypass size/depth/indefinite rules, which reduces DoS resistance.
- Status: In implementation plan (High Priority).

2) Tag parsing limit gaps and bignum edge cases
- Impact: Tagged values can bypass depth/size checks; tag 2/3 with indefinite byte strings can bypass bignum limits.
- Status: In implementation plan (High Priority).

3) Float handling in collections and -0 preservation
- Impact: Floats inside arrays/maps may fail to encode; -0 loses sign, impacting round-trip and diagnostics.
- Status: In implementation plan (Medium Priority).

4) Canonical float validation
- Impact: Deterministic encoding requires minimal float size; current parser does not enforce this.
- Status: In implementation plan (Medium Priority).

5) Duplicate key detection for non-string keys
- Impact: Stringified key comparison can cause false duplicates or missed duplicates.
- Status: In implementation plan (Low Priority).

6) Low-level hex input validation
- Impact: Direct composable usage can accept invalid hex silently.
- Status: In implementation plan (Low Priority).

## Quality Recommendations

- Align all parsing entry points to a single set of limit and canonical rules.
- Unify float encoding logic across top-level and collection encoders.
- Ensure deterministic float rules are validated when canonical mode is enabled.
- Add focused tests for source-map parsing, tagged bignums with indefinite byte strings, and -0 round-trips.

## Capacity Outlook

- Security capacity: Strong once limit enforcement is consistent across all parsers.
- Encoding correctness: Strong after float/-0 fixes and canonical float validation.
- Interop with other CBOR implementations: High, with deterministic encoding compliance improvements.

