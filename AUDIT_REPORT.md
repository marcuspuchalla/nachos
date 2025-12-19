# NACHOS Security and Software Audit Report

Date: 2025-12-19
Scope: Security review, code quality review, RFC 8949 compliance, testing quality assessment
Methodology: Manual static review of parser/encoder source and test suite. No runtime fuzzing performed.

## 1. Executive Summary

Overall risk rating: Medium

The codebase is well-structured, heavily tested, and follows RFC 8949 for most core behaviors. The most impactful issues are around limit enforcement in source-map parsing and tag parsing, where several protective checks are bypassed (depth/size limits, strict/canonical enforcement, and break validation for indefinite items). These gaps can enable denial-of-service conditions in the decoding path. A second set of issues concerns encoding correctness for floats in collections and -0 preservation, plus missing canonical float validation. Addressing these items will materially improve security hardening and spec compliance.

## 2. Detailed Findings (with Severity)

### F1: Source-map parsing bypasses limits and strict/canonical rules (High)

Impact: Parsing via `parseWithSourceMap` can allocate or recurse without enforcing `maxDepth`, `maxArrayLength`, `maxMapSize`, or `allowIndefinite` rules, and it does not require a break code for indefinite arrays/maps. This enables large inputs to consume excessive CPU/memory and bypass strict/canonical rules when source maps are requested.

Evidence:
- `src/parser/composables/useCborParser.ts:426` (parseArrayWithMap) and `src/parser/composables/useCborParser.ts:539` (parseMapWithMap) implement array/map parsing without limit checks, strict/canonical enforcement, or break validation.

Remediation guidance:
- Reuse the existing limit-checked collection parsers (or mirror their checks) in the source-map path.
- Enforce `allowIndefinite` and validate break markers for indefinite arrays/maps in the source-map path.
- Apply `maxDepth`, `maxArrayLength`, `maxMapSize`, and `maxOutputSize` during `parseWithSourceMap` to match `parse` behavior.

### F2: Tag parsing bypasses collection limits and bignum constraints for indefinite byte strings (High)

Impact: `useCborTag` parses arrays/maps without enforcing `maxDepth`, `maxArrayLength`, `maxMapSize`, or `allowIndefinite`, and it only enforces bignum size limits for tag 2/3 when the value is a raw `Uint8Array`. Indefinite-length byte strings return a `CborByteString` object, which bypasses the bignum size limit and conversion logic.

Evidence:
- `src/parser/composables/useCborTag.ts:101` (parseArrayInternal) and `src/parser/composables/useCborTag.ts:175` (parseMapInternal) do not check depth/size limits or strict/allowIndefinite rules.
- `src/parser/composables/useCborTag.ts:670` only enforces bignum limits when the tagged value is a `Uint8Array`.

Remediation guidance:
- Route tagged array/map parsing through the limit-aware collection parser or add equivalent checks for depth/size/indefinite rules.
- For tag 2/3, accept both `Uint8Array` and `CborByteString` and enforce `maxBignumBytes` on the concatenated bytes.
- Enforce break marker presence for indefinite arrays/maps inside tagged values.

### F3: Float handling in collection encoding mis-encodes or rejects non-integers (Medium)

Impact: In array/map encoding, numeric values are always passed to `encodeInteger`, which throws on non-integer numbers and prevents encoding floats inside collections. Map key sorting in canonical mode will also fail on float keys. Separately, -0 is encoded as integer 0 at the top-level encoder, losing sign information.

Evidence:
- `src/encoder/composables/useCborCollectionEncoder.ts:93` encodes any `number` via `encodeInteger`, which throws for non-integers.
- `src/encoder/composables/useCborEncoder.ts:79` encodes any safe integer (including -0) as an integer, losing -0 preservation.

Remediation guidance:
- Mirror the top-level encoder logic in `encodeValue` (integer vs float) for arrays/maps and for canonical key sorting.
- Preserve -0 by routing it through float encoding (or provide an explicit option to keep -0 as float).

### F4: Canonical float validation is missing (Medium)

Impact: `validateCanonical` does not reject non-minimal float encodings (e.g., encoding a value as float64 when float16/float32 would suffice). This is a compliance gap for RFC 8949 deterministic encoding.

Evidence:
- `src/parser/composables/useCborFloat.ts:145` parses floats without checking for minimal encoding when `options.validateCanonical` is enabled.

Remediation guidance:
- When `validateCanonical` is true, verify that the decoded float cannot be represented in a shorter float encoding without loss, and throw if it can.
- For NaN, enforce the preferred canonical NaN encoding if strict canonical compliance is desired.

### F5: Duplicate key detection can collide for non-string keys (Low)

Impact: Duplicate map key detection uses `String(key)` for non-byte keys, which can collapse distinct keys (e.g., two different objects both become `[object Object]`). This can produce false duplicate warnings or rejections in strict/canonical modes.

Evidence:
- `src/parser/composables/useCborCollection.ts:37` (convertKeyToString) uses `String(key)` for non-byte keys.

Remediation guidance:
- Use a byte-level serialization of the key for duplicate detection (e.g., capture raw key bytes during parsing and compare those).
- Alternatively, use a stable canonical representation (such as diagnostic notation or re-encoding the key bytes) for duplicate checks.

### F6: Low-level hex parsing silently accepts invalid characters (Low)

Impact: `hexToBytes` uses `parseInt` without validation; invalid hex characters are converted to `NaN` and coerced to 0 in `Uint8Array`. Direct use of composables can silently accept invalid input.

Evidence:
- `src/parser/utils.ts:11` converts hex without validation.

Remediation guidance:
- Add validation in `hexToBytes` (even-length, hex-only), or ensure all public entry points validate before calling `hexToBytes`.

## 3. Remediation Guidance (Summary)

- Enforce limits and canonical rules uniformly for all parse paths, including `parseWithSourceMap` and tag parsing.
- Extend bignum checks to indefinite-length byte strings and enforce break markers where required.
- Correct float handling in collection encoding and preserve -0 when appropriate.
- Add canonical float validation when `validateCanonical` is enabled.
- Use byte-accurate key representations for duplicate detection.
- Validate hex input in low-level helpers or gate all public entry points with stricter checks.

## 4. RFC 8949 Compliance Checklist

Status legend: Pass / Partial / Fail / Not evaluated

- Major types 0-7 encode/decode: Pass
- Integer canonical encoding (shortest form): Pass
- String length canonical encoding: Pass
- Map key canonical ordering (deterministic): Pass (parse/encode), Partial (source-map parse bypasses rules)
- Indefinite-length handling: Partial (strict/canonical enforcement missing in source-map/tag parsing)
- Float minimal encoding (deterministic): Fail (no canonical float validation)
- Tag semantics validation (tags 0/1/4/5/32/33/34/35/36/258): Pass (configurable)
- Bignum limits (tags 2/3): Partial (indefinite byte strings bypass limit)
- UTF-8 strict validation: Pass (when enabled)
- Round-trip integrity (encode-decode-encode): Partial (floats in collections and -0 preservation)

## 5. Test Gap Analysis

Recommended additional tests:
- `parseWithSourceMap` honors `maxDepth`, `maxArrayLength`, `maxMapSize`, `allowIndefinite`, and detects missing break markers for indefinite arrays/maps.
- Tagged values containing deeply nested arrays/maps respect `maxDepth` and size limits.
- Tag 2/3 with indefinite-length byte strings enforces `maxBignumBytes` and yields BigInt results.
- Encoding arrays/maps containing floats, NaN/Infinity, and -0 (including map keys) behaves correctly.
- Canonical validation rejects non-minimal float encodings.
- Duplicate key detection for non-string keys (arrays, maps, objects) behaves deterministically.

Fuzzing recommendation:
- Integrate a small fuzz harness (e.g., property-based tests) for encode/decode round-trips and for parser limits with random CBOR inputs.
