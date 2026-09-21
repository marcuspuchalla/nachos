**Nachos, TACO, and cbor.app audit — 9 September 2026**

The current Nachos candidate should be corrected before release. Its existing tests pass, but independent probes found malformed-input acceptance, lost data, inconsistent validation, and incorrect deterministic encoding checks. TACO's scoring also needs repairs before its results can substantiate an ecosystem coverage claim.

**TL;DR of proposed changes**

- **Nachos:** fix unterminated strings, Unicode BOM loss, bignum validation, map-key equality, source-map parity, float-width validation, simple-value encoding, and depth-limit propagation. Correct Cardano transaction/witness interpretation. Build extension support on a lossless CBOR representation and explicit profiles.
- **TACO:** preserve CBOR types in its bridge, separate decode/encode/round-trip results, verify encoder output, stop counting adapter errors as successful rejection, and make generators reproduce the corrected corpus. Add requirements-based coverage and real fixtures with provenance. Expand the configured 19 implementations with the 19 candidates below.
- **cbor.app:** align the installed package and lockfile after the release, expose trailing input and decoding profiles, preserve mixed map keys and special values in the UI/export, and replace the obsolete external test corpus and false-pass test behavior.
- **Rollout:** finish and verify the candidate locally, obtain your acknowledgment, publish Nachos, then update TACO and the app against that exact published artifact. No publication or deployment was performed.

Only the files in this audit directory were added by this audit. Production source, manifests, lockfiles, and the extensive pre-existing July changes were preserved. Builds regenerated ignored build output. The existing `nachos-audit.txt`, HTML review, and July regression files are earlier work, not changes made here.

Read the [Nachos findings](nachos.md), [TACO findings and coverage plan](taco.md), [app findings and release plan](app.md), [standards matrix](standards.md), and [library expansion list](libraries.md).

**What was verified**

| Check | Result and limits |
| --- | --- |
| Nachos existing suite | 47 files, **1,577 passing tests** on Node 24.13.1 |
| Nachos TypeScript and build | Pass; ESM and CommonJS export smoke checks pass |
| Independent audit probes | **152 checks: 37 expectations met, 115 unmet**; repeated across API/input combinations, including requested completeness features; not 115 distinct bugs or a coverage percentage |
| Exhaustive float-width check | Of 63,488 finite binary16 bit patterns widened to binary32, **63,406 incorrectly pass deterministic validation** |
| Current TACO vector lint | Pass, 0 errors, 0 warnings; **355 cases** across 19 JSON files |
| TACO source runner with current Nachos source adapter | In-memory transport: 352 passes, 2 mismatches, 1 permitted depth-limit rejection; **not a Docker comparison or a trustworthy coverage score** |
| TACO generators in temporary copy | Change 12 files, remove all 10 `anyOf` policies, and cause **41 vector-lint errors** |
| TACO TypeScript | Default build picks up global TypeScript because local dependencies are absent and fails on TS5107. Source type-check passes using Nachos's local TypeScript 5.6 and Node type definitions; clean TACO install/build remains to be verified |
| App TypeScript, build, tests | Pass under Node 24.13.1; **701 tests reported passing**, including three test bodies that return early on decoder errors |
| App dependency | Installed package says 0.4.0, and its production source files match local Nachos; app lockfile resolves 0.3.0 |
| npm registry | `npm view @marcuspuchalla/nachos version dist-tags --json`: **latest is 0.3.0** at audit time |
| Public site | HTTP 200; public entry asset `/assets/index-BSgHYIEy.js` differs from local build. No deployed Nachos package provenance was established |

The initial app test attempt used the shell's Node 16 and failed before tests started. Re-running with the installed Node 24 resolved that environment issue. Docker 28.5.1 is available, but none of the TACO library images were present. A fresh 19-container benchmark was not run; this audit exercises the current runner/adapter source directly and demonstrates why publishing another ranking now would be premature.

The observations cover the working trees at Nachos `c712795`, TACO `81ea7ba`, and cbor_decoder `31d08d2`, including existing uncommitted changes. [observations.json](observations.json) records full commit IDs, diff hashes, source hashes, individual outcomes, and the three corpus failures. [generator-observations.json](generator-observations.json) records generation drift. [iana-rfc-index.json](iana-rfc-index.json) records the main IANA registry's RFC references, and [library-candidates.json](library-candidates.json) records repository checks.

To repeat the targeted probes from the Nachos repository with Node 20 or newer and its development dependencies installed:

```sh
node audits/2026-09-09/probe.mjs > /tmp/nachos-audit-observations.json
node audits/2026-09-09/probe-generators.mjs > /tmp/taco-generator-observations.json
```

The probe intentionally emits observations and exits successfully when collection completes; inspect `met` fields for failures. It builds source into a temporary directory, mocks TACO's HTTP transport, and removes its temporary files. It does not modify production source or normal test-suite expectations.

The applicable baseline is [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html), supplemented by independently scoped extensions and application specifications. The evidence supports a concrete repair plan; it does not support a claim that Nachos already has the greatest CBOR coverage in the ecosystem.
