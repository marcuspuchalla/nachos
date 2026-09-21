# September roadmap completion — unpublished 0.4.0 candidate

All six items from the September 11 roadmap now have implementations and positive/negative regression coverage. TACO and cbor.app install the same local Nachos candidate. Publication and deployment remain pending release acknowledgment.

| Roadmap item | Implemented behavior and checks |
| --- | --- |
| RFC 8742 incremental streaming | Stateful chunk framing, complete-item emission with byte offsets, async iterable decoding, truncated EOF rejection, item/stream budgets and every-byte split tests. The app uses the incremental decoder in sequence mode. |
| RFC 9581 extended time | Tags 1001/1002/1003, exact integer/fraction and scaled coefficients, explicit timescales, clock-quality fields and periods. Invalid critical keys, duplicate bases, fraction combinations and malformed periods are rejected. No implicit TAI-to-UTC conversion. |
| RFC 9164 IP addresses | Tags 52/54 for addresses, prefixes and interfaces, IPv4/IPv6 formatting, optional zones and prefix validation. Checks address widths, prefix bounds and prohibited trailing/host bits. |
| RFC 8610 CDDL | Optional explicit WASM initialization; schemas, named roots, groups, occurrences, choices, generics, recursion, sockets, tags, unwrapping, ranges and control operators. A pinned cddl-rs backend has local repairs for failures discovered by these tests. |
| Cardano CIP-21 | Pinned Conway CDDL plus canonical serialization, integer/count limits, set-tag consistency, duplicate sets, optional empty collections, supported certificates, pool-registration exclusions, single voting procedure and Catalyst auxiliary-data workflow. Results identify whether a complete envelope or body was supplied. |
| COSE signatures | Sign1 and every signer in Sign; trusted public CryptoKey/JWK/COSE_Key inputs, protected headers, critical-header handlers, key/algorithm policy, detached payloads and external AAD. ECDSA P-256/P-384/P-521 and Ed25519/Ed448 use Web Crypto, with RFC 9864 identifiers and legacy identifiers. |

Large hex/byte conversion now uses bounded intermediate arrays and direct nibble decoding. Successful user-schema diagnostics are cached in a bounded cache; the immutable CIP-21 schemas are linted in tests instead of repeating that diagnostic pass for every transaction.

The CDDL backend patch fixes scalar-vs-map false positives, constrained/structured map keys, recursive validation, uint64/negative integer literals on wasm32, float representability, tagged prelude types, generic tag unwrapping, undefined/null distinction, and `.cbor`/`.cborseq` decoding. The patch, upstream revision, locked Rust dependencies, source snapshots and artifact hashes are in [the source manifest](../../specs/roadmap-2026-09/sources.json). `node scripts/build-cddl.mjs` rebuilds it. This is an optional MIT-licensed backend; the TypeScript codec still has no runtime package dependencies.

## Cardano app additions

The app includes eight full provider transactions and seven byte-exact excerpts. Six transactions are mainnet snapshots fetched from Koios; two are historical Blockfrost preprod snapshots. The source banner shows the network, transaction ID, provider, retrieval date and original byte range, with the matching explorer link. CSL and CML independently reproduce every transaction body hash. A repeat Koios fetch matched all six stored mainnet byte strings.

Examples include [a mainnet Plutus spend](https://cardanoscan.io/transaction/20fc94b32bb239c45fa7edec762ce6ddec2cf4d53b7da46cf3313d27cfaf7c69), [a DRep vote with a rationale anchor](https://cardanoscan.io/transaction/7c8943d1573c39a4b5e8639039c214c49b658bc488dcd54c712f847f639e3f7f), and preprod inline-datum/mint transactions. All eight validate against the pinned Conway transaction schema. The app's scripts/governance panel exposes votes, certificate kinds, mint/burn assets, redeemers and execution units, datums, reference scripts and inputs, withdrawals and treasury fields. Inspect controls open the exact embedded bytes.

Custom CDDL and CIP-21 checks run in a cancellable worker with a five-second deadline. The PWA precaches the WASM asset for offline use. Synthetic delegation, nested-constructor and inline-datum examples were corrected; era detection no longer treats Babbage output maps as transaction bodies or crashes on non-integer fee values.

## TACO integration

Four independently negotiated operations (`stream-decode`, `cddl-validate`, `cip21-validate`, `cose-verify`) exercise functionality beyond generic decoding. The expanded corpus has 3,195 operations across 46 catalog requirements and 26 configured adapters. Unsupported operations remain visible in denominators and cannot pass negative tests. Published COSE/CWT vectors and independent node-cbor/Web Crypto signatures test cryptographic verification; provider transactions use an independent CBOR wire oracle and two Cardano hash implementations.

A missing adapter operation describes that adapter's exposed capability, not every feature available in its ecosystem. These observations establish coverage of the scheduled assertions; they do not prove full RFC conformance or determine a universally “best” library. Core and extension operations remain separately reported.

## Verification

| Check | Result |
| --- | --- |
| Nachos | 1,803 tests in 52 files; typecheck and ESM/CommonJS build pass. Packaged CommonJS, WASM and streaming smoke checks pass. |
| TACO harness and fixtures | 13 harness tests pass; 3,195 vectors lint without errors; all 29 generated fixture files match their sources. |
| Complete ecosystem matrix | All 26 adapters completed 83,070 scheduled operations with zero bridge errors. Per-library passes, unsupported operations, mismatches and resource limits are retained in the results. |
| Nachos in the Docker matrix | 3,195/3,195 operations pass, covering all associated assertions for 46/46 catalog requirements. |
| App | 3,561 tests in 24 files pass, including the 3,195 TACO vectors; typecheck and production build pass. |
| Production browser | Four tests pass: real transaction inspection and validation, offline WASM, decoder workflows and cached PWA upgrade. |
| Real data | Eight transaction hashes reproduced by CSL and CML; six mainnet CBOR snapshots refetched from Koios and matched; seven excerpts verified against exact source byte ranges. |
| Candidate identity | Both vendor tarballs, lockfile integrity values, all installed distribution files and the app's production build identity match the final candidate. |

The final tarball SHA-256 is `d8a1ed19f12b7af8f0e2f506b27fdd24bcdd70d69eb9916b7a50fe3a7a893527`.

Final run counts, versions, package identities and evidence hashes are recorded in [verification.json](verification.json). The ecosystem breakdown is in [TACO's results](../../../taco/docker/reports/TEST_RESULTS.md).

## Boundaries and release

CDDL is schema validation, and CIP-21 is serialized signing compatibility. Neither establishes current ledger acceptance, script execution, key trust or the support of a specific hardware device. COSE verification requires caller-supplied trusted keys; supported signature curves depend on Web Crypto. Encryption, MAC verification and other cryptographic suites are outside this signature API. Unknown CBOR tags are preserved; registry naming alone does not claim semantic validation.

Untrusted CDDL should run in a terminable worker because recursive schema evaluation cannot be bounded by schema size alone. The app has a five-second worker deadline, a 2 MB input limit and a 1,000-item sequence display limit; TACO workers have a two-second core-codec budget, a separately reported five-second schema-operation budget and a 256 MB heap limit. The schema budget accommodates cold WASM/ledger-schema evaluation and applies uniformly to CDDL/CIP-21 operations in Node adapters. Limit failures are distinct from invalid CBOR/schema results.

The locally packed candidate is [Nachos 0.4.0](../../artifacts/marcuspuchalla-nachos-0.4.0.tgz). No package publication, site deployment or commits were performed. After release acknowledgment: publish the reviewed artifact, verify registry identity, replace both local file pins with the exact registry version, repeat the integration checks and deploy the app with its tested PWA update flow.

Standards: [RFC 8742](https://www.rfc-editor.org/rfc/rfc8742.html), [RFC 9581](https://www.rfc-editor.org/rfc/rfc9581.html), [RFC 9164](https://www.rfc-editor.org/rfc/rfc9164.html), [RFC 8610](https://www.rfc-editor.org/rfc/rfc8610.html), [RFC 9052](https://www.rfc-editor.org/rfc/rfc9052.html), [RFC 9053](https://www.rfc-editor.org/rfc/rfc9053.html), [RFC 9864](https://www.rfc-editor.org/rfc/rfc9864.html), [CIP-21](https://cips.cardano.org/cip/CIP-0021). Exact retrieved revisions and hashes are in the source manifest.
