**Library comparison inventory and expansion plan**

The authoritative enabled list is [docker-compose.yml](../../../taco/docker/docker-compose.yml)'s `CONTAINERS`/`depends_on`, not package.json, README claims, or the existence of an adapter file. The following 19 are configured. This audit did not rerun their Docker images or certify their adapters and current upstream versions.

| Configured implementation | Language | Audit action |
| --- | --- | --- |
| Nachos | JavaScript/TypeScript | Test the reviewed candidate artifact and actual release version |
| borc | JavaScript | Keep as a compatibility comparison |
| cbor-x | JavaScript | Test generic/extension options explicitly |
| node-cbor (`cbor`) | JavaScript | Keep; distinguish from its cbor2 successor |
| cbor-js | JavaScript | Record supported subset and encoding limitations |
| cbor-redux | JavaScript | Record supported subset and adapter normalization |
| @levischuck/tiny-cbor | JavaScript | Identify by full package name; distinct from C TinyCBOR |
| cbor-sync | JavaScript | Keep as a compatibility comparison |
| cborg | JavaScript | Score its documented options/profiles; distinct from Haskell cborg |
| @ipld/dag-cbor | JavaScript | Give DAG-CBOR its own scope and generic subset measures |
| cbor2 | Python | Record selected native/pure implementation and exact package version |
| ciborium | Rust | Test Value-level CBOR behavior; avoid narrowing through serde_json |
| fxamacker/cbor | Go | Test named decoder/encoder options, not only defaults |
| libcbor | C | Verify all types survive the HTTP bridge |
| com.upokecenter:cbor | Java | Pin Maven version and preserve arbitrary precision |
| PeterO.Cbor | C# | Pin NuGet/runtime version and preserve arbitrary precision |
| spomky-labs/cbor-php | PHP | Verify integer/float/key representation in the bridge |
| cbor | Ruby | Pin gem/runtime and distinguish map keys |
| CBOR::XS | Perl | Verify typed output and errors before scoring |

Some of the following already appear in root dependencies or `examples/`, but none is in that enabled Docker list. These **19 additions would make a 38-implementation catalog**, with profile-specific comparisons. Repository existence and archived status were checked through GitHub's API on 2026-09-09; the [metadata](library-candidates.json) does not establish correctness, release freshness, or benchmark results.

| Candidate and primary source | Language | Priority / reason to include |
| --- | --- | --- |
| [cbor2](https://github.com/hildjj/cbor2) | JavaScript | First wave: successor to node-cbor, with diagnostics and registered-tag support; an existing example adapter needs promotion and verification |
| [@harmoniclabs/cbor](https://github.com/HarmonicLabs/cbor) | TypeScript | First wave: Cardano-adjacent CBOR object model; existing dependency/adapter |
| [@stablelib/cbor](https://github.com/StableLib/stablelib) | TypeScript | First wave: existing dependency; independent implementation |
| [@oslojs/cbor](https://github.com/oslo-project/cbor) | TypeScript | First wave: existing dependency; compare its declared subset |
| [@stricahq/cbors](https://github.com/StricaHQ/cbors) | TypeScript | First wave: existing dependency; Cardano-oriented use cases |
| [QCBOR](https://github.com/laurencelundblade/QCBOR) | C | First wave: embedded/general CBOR API and tag validation comparison |
| [TinyCBOR](https://github.com/intel/tinycbor) | C/C++ | First wave: established independent C implementation |
| [zcbor](https://github.com/nordicsemi/zcbor) | C | First wave: low-footprint parsing and generated CDDL profiles; separate schema-generated tests from generic API tests |
| [NanoCBOR](https://github.com/bergzand/NanoCBOR) | C | Second wave: constrained-device coverage and explicit resource policy |
| [minicbor](https://github.com/twittner/minicbor) | Rust | First wave: no_std and tokenizer/decoder API comparison |
| [cbor4ii](https://github.com/quininer/cbor4ii) | Rust | Second wave: independent core/Serde implementation |
| [jsoncons CBOR](https://github.com/danielaparker/jsoncons) | C++ | Second wave: another object/event-oriented implementation |
| [nlohmann/json CBOR](https://github.com/nlohmann/json) | C++ | Second wave: widely used JSON-oriented data model; score explicit CBOR restrictions |
| [Jackson CBOR](https://github.com/FasterXML/jackson-dataformats-binary) | Java | Second wave: stream/token and data-binding behavior |
| [kotlinx.serialization CBOR](https://github.com/Kotlin/kotlinx.serialization) | Kotlin | Second wave: schema-driven implementation; report that scope explicitly |
| [cborg](https://github.com/well-typed/cborg) | Haskell | First wave: independent Haskell codec relevant to the Cardano ecosystem |
| [cardano-serialization-lib](https://github.com/Emurgo/cardano-serialization-lib) | Rust/WASM | First wave, Cardano profile: typed transaction and Plutus oracle; already a root dependency |
| [cardano-multiplatform-lib](https://github.com/dcSpark/cardano-multiplatform-lib) | Rust/WASM | First wave, Cardano profile: independent serialization/round-trip comparison; already a root dependency |
| [Pallas](https://github.com/txpipe/pallas) | Rust | Second wave, Cardano profile: ledger primitives and era-specific decoding |

Also retain inactive/legacy adapters such as `node-cbor-decoder` as explicitly labeled compatibility targets if useful. Do not count an encoder/decoder wrapper twice as independent implementations, or count two runtime backends as separate libraries without explaining the relationship. Legacy `serde_cbor` can be a historical target, but should not replace current Rust alternatives; its [repository](https://github.com/pyfisch/cbor) documents its maintenance status.

Before enabling each candidate, add adapter contract tests for byte/text distinction, integer/text distinction, signed zero, large integer precision, simple values, tags, mixed/structured keys, trailing input, and clean errors. Verify versions from the loaded implementation. Run it against a small reviewed core set before the complete matrix. Cardano-specific libraries should receive relevant typed fixtures rather than being penalized for lacking an arbitrary-CBOR API.

Use the [CBOR implementation catalog](https://cbor.io/impls.html) for further discovery. Additions should be driven by independent implementation coverage and real usage; an honest matrix of 38 well-tested implementations is more useful than a longer list whose bridges erase the differences being measured.
