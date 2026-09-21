Current roadmap implementation and verification: [21 September follow-up](../2026-09-21/README.md). This report and its package digest describe the earlier candidate.

**Nachos 0.4.0 candidate — audit repairs, verified 11 September 2026**

The concrete decoding, scoring, and app integration defects from the [original audit](../2026-09-09/README.md) have been addressed in the working trees. Nachos is packed locally, and TACO and the app install the same unpublished tarball through their checked lockfiles. Publication and deployment remain pending release review.

**Changes for review**

- **Nachos:** one bounded scanner now serves normal decoding, bytes, source maps, and sequences. It rejects missing string terminators, preserves Unicode BOMs, validates raw tag contents before interpretation, handles structural map keys and full uint64 tag numbers, and checks preferred float widths correctly. Encoding respects retained map entries while applying deterministic ordering, supports simple values, and shares depth/output budgets. Cardano transaction envelopes, Conway witness sets, and recursive Plutus validation are corrected.
- **Representation and extensions:** lossless source nodes retain wire types and original bytes. Typed JSON, diagnostics, semantic comparison, and deterministic encoding operate on those nodes. Named permissive, RFC 8949, deterministic, and Cardano profiles separate policies. Optional registered-tag validators cover typed arrays/multidimensional arrays, dates, OIDs, and UUIDs. A reproducible generator records 365 entries from the pinned IANA registry; a registered name does not imply semantic validation.
- **TACO:** version 3 uses explicit CBOR types, an independent encoder oracle, separate operations/profiles, and explicit rejection classes. Generator drift and incorrect legacy expectations are fixed. The corpus contains 2,846 operation vectors, including pinned RFC examples, COSE/CWT structures, and 24 actual Cardano preproduction transactions. A 46-requirement catalog retains untested requirements in the denominator. There are 26 configured adapters, with a broader researched library catalog. Codec workers isolate hangs and memory exhaustion; reports retain actual versions, artifact/adapter/corpus hashes, limitations, and infrastructure failures.
- **cbor.app:** worker decoding is cancellable, input and rendering work are bounded, single-item/sequence modes and validation profiles are explicit, and sequence container boundaries are correct. Typed maps and special values survive display/export. Deterministic re-encoding shows byte and semantic comparisons separately. The app consumes the reviewed TACO snapshot and exact candidate tarball, exposes build identity, and offers a tested update flow for cached PWAs. Hardcoded scraper credentials were replaced with environment variables.

**Repair map**

| Original findings | Resolution |
| --- | --- |
| N01–N04: malformed strings, BOM, tag contents, source-map parity | Shared scanner and API parity regressions |
| N05–N07: key equality, float widths, map/simple encoding | CBOR structural equality, wire float metadata, corrected width checks and encoder dispatch |
| N08–N09: resource limits and tag range | Shared traversal budgets, preallocation checks, full uint64 tags |
| N10: advertised semantic validation | Raw type validation, bounded embedded CBOR checks, calendar/base64 checks, opt-in registered extensions |
| N11: Cardano interpretation | Shelley/Alonzo envelope distinction, witness-set unwrapping, Plutus constructor/range/chunk checks |
| N12: diagnostics and completeness claims | Common extended notation and source-node diagnostics added; claims narrowed to implemented grammar and profiles |
| T01–T06: type loss, false passes, ignored profiles, generator/oracle defects | Shared v3 scorer, typed protocol, independent oracle, deterministic fixture generation and lint |
| T07–T09: stale artifacts, exit status, scoring/provenance | Exact candidate/locks, actual runtime identity, required matrices, bounded execution, explicit operation/requirement denominators |
| A01–A07: dependency drift, data loss, trailing input, false-pass tests, comparisons, blocking UI, stale PWA | Exact local artifact, typed UI/export, explicit modes/profiles, shared corpus, worker cancellation, bounded rendering, build identity and upgrade tests |

**Verified evidence**

| Check | Result |
| --- | --- |
| Nachos unit/regression suite | 1,603 passed |
| Nachos TypeScript, ESM/CommonJS builds and export smoke checks | Passed |
| Targeted original core audit recheck | [141/141 expectations met](core-observations.json) |
| Exhaustive finite binary16 widening check | 63,488 patterns; zero incorrectly accepted binary32 representations under deterministic validation |
| TACO harness and fixture checks | 10 harness tests passed; 2,846 vectors, zero lint errors; 23 generated files reproduce |
| Complete Docker ecosystem matrix | 26 adapters, 73,996 scheduled operations; zero bridge errors; runner exit code 0 |
| Nachos through TACO's Docker adapter | 2,846/2,846 scheduled vectors passed |
| App unit/regression suite | 3,195 passed, including the TACO snapshot |
| App TypeScript and production build | Passed |
| Production browser tests | 2 passed: worker/modes/export/cancellation and upgrade from an older cached PWA |

The completed ecosystem run is recorded in [TACO's observations](../../../taco/docker/reports/TEST_RESULTS.md), with a compact [verification manifest](verification.json) preserving package identity, all 26 installed library versions, image/report hashes, and check outcomes. Nachos passes the 40 requirements currently exercised; six roadmap requirements remain explicitly untested. Local toolchain checks and Docker checks have different runtime identities and are not combined into a ranking. A passing corpus is evidence about these cases, not proof of complete RFC or Cardano ledger conformance.

One original audit assumption was corrected: [RFC 8949 §3.4.2](https://www.rfc-editor.org/rfc/rfc8949.html#section-3.4.2) leaves tag-1 nonfinite timestamp interpretation application-defined. Generic decoding therefore does not reject those values solely for being nonfinite.

**Explicit boundaries**

The requirement catalog marks incremental streaming, RFC 9581 extended time, RFC 9164 IP addresses, CDDL validation, full CIP-21 validation, and COSE cryptographic verification as untested roadmap work. Cardano checks cover documented structures and Plutus data, not ledger acceptance or signature verification. The diagnostic reader implements common extended forms, not every production of every diagnostic-notation draft. Registry lookup is descriptive; unknown tags remain preservable without invented semantics.

The app limits each input to 2 MB, output accounting to 8 MB, sequences to 1,000 items, and collection/tag depth to 100/64. Worker cancellation terminates computation, and large JSON/hex/tree views render in pages. The lossless encoder preserves a source node's original byte snapshot; editing requires reconstructing a value and explicitly choosing an encoding policy.

**Candidate and rollout**

The [local package](../../artifacts/marcuspuchalla-nachos-0.4.0.tgz) has npm integrity:

```
sha512-yZRpr1bNpROW8wR89COzvs8ePl5poUoMPAVQCY/quHaOKMdDgv38hPtZlNX9NgBgYFi45YHHlzL2GWMyGS7YxA==
```

Both sibling projects install that exact file from `vendor/`. After release acknowledgment, publish the reviewed Nachos version, verify registry integrity and imports, replace both local-file pins with the exact registry version, rerun the integration checks, then deploy and verify the served build identity and PWA update. No npm publication or deployment has been performed.

The pre-existing July changes remain in place. This work has not created commits or discarded unrelated edits.
