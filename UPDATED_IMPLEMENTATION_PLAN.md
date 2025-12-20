# Updated Implementation Plan (Post V2 Seaborne Audit)

Date: 2025-12-19
Source: `CBOR_CAPACITY_REVIEW_V2.md`

## Goals

- Close remaining CBOR deterministic encoding compliance gaps.
- Ensure encoder options are honored consistently.
- Tighten tag semantics for bignum tags when strict validation is enabled.

## Work Items

### 1) Enforce canonical NaN payload for float16 (Medium)

Why:
- Deterministic encoding requires the preferred NaN payload (0xf97e00).

How:
- In `parseFloatFromBuffer`, when `validateCanonical` is enabled and AI=25 (float16), inspect the raw 16-bit payload and reject any NaN not equal to 0x7e00.

Where:
- `src/parser/composables/useCborFloat.ts`

Tests:
- Add a canonical test rejecting float16 NaN with non-canonical payload (e.g., 0xf97e01).


### 2) Enforce `allowIndefinite` in encoder (Medium)

Why:
- Encoder should respect the explicit `allowIndefinite` option.

How:
- If `allowIndefinite` is false, reject any attempt to encode indefinite-length arrays/maps or text/byte strings, even if marked with `INDEFINITE_SYMBOL` or requested via options.

Where:
- `src/encoder/composables/useCborCollectionEncoder.ts`
- `src/encoder/composables/useCborStringEncoder.ts`

Tests:
- Ensure indefinite encoding throws when `allowIndefinite` is false.


### 3) Enforce `rejectDuplicateKeys` in encoder (Low/Medium)

Why:
- The option is currently unused; should guard against duplicates when encoding maps with `ALL_ENTRIES_SYMBOL` or map entries that can collide.

How:
- When `rejectDuplicateKeys` is true, check encoded key byte identity (canonical bytes) before encoding.

Where:
- `src/encoder/composables/useCborCollectionEncoder.ts`

Tests:
- Duplicate keys via `ALL_ENTRIES_SYMBOL` should throw when `rejectDuplicateKeys` is true.


### 4) Tag 2/3 strict type validation (Low)

Why:
- RFC 8949 expects tags 2/3 to carry byte strings; strict modes should reject other types.

How:
- If `validateTagSemantics` or `strict` is enabled, require the tagged value to be a byte string (definite or indefinite). Throw otherwise.

Where:
- `src/parser/composables/useCborTag.ts`

Tests:
- Tag 2/3 with non-byte-string value should throw in strict/validateTagSemantics modes.
