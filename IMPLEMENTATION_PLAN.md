# Implementation Plan

**Version:** 0.1.1
**Last Updated:** 2025-12-19
**Status:** Complete
**Source:** Remediation tasks derived from [AUDIT_REPORT.md](./AUDIT_REPORT.md)

---

## Overview

This plan addresses security and compliance gaps identified in the internal audit. The goal is to close all high-priority items before the next major release.

### Progress Summary

| Priority | Total | Completed | In Progress | Not Started |
|----------|-------|-----------|-------------|-------------|
| High     | 3     | 3         | 0           | 0           |
| Medium   | 3     | 3         | 0           | 0           |
| Low      | 2     | 2         | 0           | 0           |

---

## High Priority

### 1. Enforce limits in source-map parsing

**Status:** Completed
**Finding:** F1
**Effort:** Medium

**Problem:**
`parseWithSourceMap` bypasses depth/size limits and canonical/indefinite rules, enabling DoS vectors and inconsistent behavior compared to `parse`.

**Solution:**
- [x] Add `maxDepth` checks to `parseArrayWithMap` and `parseMapWithMap`
- [x] Add `maxArrayLength` and `maxMapSize` checks
- [x] Enforce `allowIndefinite` option
- [x] Require break markers for indefinite arrays/maps
- [x] Apply output size tracking consistently

**Files:**
- `src/parser/composables/useCborParser.ts` (lines ~426, ~539)

---

### 2. Enforce collection limits in tag parsing

**Status:** Completed
**Finding:** F2
**Effort:** Medium

**Problem:**
Tag parsing uses its own array/map parser without limits; depth and size limits are not enforced, allowing oversized or deeply nested tagged values.

**Solution:**
- [x] Add `maxDepth` checks to `parseArrayInternal` and `parseMapInternal`
- [x] Add `maxArrayLength` and `maxMapSize` checks
- [x] Enforce `allowIndefinite` option
- [x] Require break markers for indefinite arrays/maps inside tags

**Files:**
- `src/parser/composables/useCborTag.ts` (lines ~101, ~175)

---

### 3. Apply bignum size limits to indefinite byte strings

**Status:** Completed
**Finding:** F2
**Effort:** Low

**Problem:**
Tags 2/3 enforce `maxBignumBytes` only for raw `Uint8Array`. Indefinite byte strings return a `CborByteString` and bypass the limit and conversion logic.

**Solution:**
- [x] Detect `CborByteString` type when handling tag 2/3
- [x] Use concatenated bytes for size checks
- [x] Enforce `maxBignumBytes` for both definite and indefinite byte strings
- [x] Ensure BigInt conversion works for both types

**Files:**
- `src/parser/composables/useCborTag.ts` (line ~670)

---

## Medium Priority

### 4. Correct float handling in collection encoding

**Status:** Completed
**Finding:** F3
**Effort:** Medium

**Problem:**
Arrays/maps encode numbers as integers only, which fails for non-integer floats and breaks canonical map-key sorting for float keys.

**Solution:**
- [x] Check `Number.isInteger(value)` before routing to integer encoder
- [x] Route non-integers to float encoder
- [x] Update canonical key sorting to handle float keys correctly

**Files:**
- `src/encoder/composables/useCborCollectionEncoder.ts` (line ~93)

---

### 5. Preserve -0 in encoding

**Status:** Completed
**Finding:** F3
**Effort:** Low

**Problem:**
The encoder treats `-0` as integer 0, losing the sign and violating correct float semantics for round-trips.

**Solution:**
- [x] Add `Object.is(value, -0)` check before integer encoding
- [x] Route `-0` to float encoder
- [x] Add tests for `-0` round-trip preservation

**Files:**
- `src/encoder/composables/useCborEncoder.ts` (line ~79)
- `src/encoder/composables/useCborCollectionEncoder.ts`

---

### 6. Add canonical float validation

**Status:** Completed
**Finding:** F4
**Effort:** Medium

**Problem:**
`validateCanonical` does not reject non-minimal float encodings, which is required for deterministic encoding compliance (RFC 8949 Section 4.2.1).

**Solution:**
- [x] When `validateCanonical` is enabled, check if float could be represented in smaller type
- [x] Reject float64 values that fit in float32
- [x] Reject float32 values that fit in float16
- [x] Enforce canonical NaN encoding (optional, configurable)

**Files:**
- `src/parser/composables/useCborFloat.ts` (line ~145)

---

## Low Priority

### 7. Fix duplicate key detection for non-string keys

**Status:** Completed
**Finding:** F5
**Effort:** Medium

**Problem:**
Stringifying non-string keys can collapse distinct keys (e.g., two objects become `[object Object]`), causing false duplicate detection.

**Solution:**
- [x] Capture raw key bytes during parsing
- [x] Compare byte representations for duplicate detection
- [x] Alternatively, use canonical encoding or diagnostic notation for key identity

**Files:**
- `src/parser/composables/useCborCollection.ts` (line ~37)

---

### 8. Validate hex input in low-level helpers

**Status:** Completed
**Finding:** F6
**Effort:** Low

**Problem:**
`hexToBytes` accepts invalid hex silently by converting `NaN` to 0, leading to surprising behavior when composables are used directly.

**Solution:**
- [x] Add hex validation in `hexToBytes` (even length, `[0-9a-fA-F]` only)
- [x] Throw descriptive error for invalid input
- [x] Document that composables expect validated input

**Files:**
- `src/parser/utils.ts` (line ~11)

---

## Test Plan

New tests to add after implementing fixes:

- [ ] `parseWithSourceMap` enforces depth/size limits
- [ ] `parseWithSourceMap` rejects missing break markers for indefinite items
- [ ] Tagged values honor depth/size/indefinite rules
- [ ] Tag 2/3 with indefinite byte strings enforces `maxBignumBytes`
- [ ] Encoding arrays/maps with floats works correctly
- [ ] Encoding `-0` preserves sign (round-trip test)
- [ ] Canonical validation rejects non-minimal float encodings
- [ ] Duplicate key detection for non-string keys is stable

---

## Future Considerations

- **Fuzz testing:** Integrate property-based testing for encode/decode round-trips
- **Performance benchmarks:** Add benchmarks before claiming performance numbers
- **Browser testing:** Add automated browser testing via Playwright or similar

---

## Changelog

### 2024-12-19 (This Update)

**Changes made to this document:**

1. **Added progress tracking table** - Visual summary of task completion status
2. **Added status indicators** - Each task now shows Not Started/In Progress/Completed
3. **Added effort estimates** - Low/Medium/High effort for planning purposes
4. **Added finding references** - Links each task to the corresponding audit finding (F1-F6)
5. **Converted solutions to checklists** - Actionable checkboxes for tracking progress
6. **Added specific line numbers** - More precise file location references
7. **Added Test Plan section** - Consolidated test requirements with checkboxes
8. **Added Future Considerations** - Items to address after remediation
9. **Reorganized by priority** - Clear sections for High/Medium/Low priority
10. **Added version and status metadata** - Document versioning for tracking
