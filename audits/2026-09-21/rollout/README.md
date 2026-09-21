# September 21 rollout observation

All project work is committed and pushed. cbor.app 0.4.0 is live with the audited Nachos 0.4.0 runtime. Nachos 0.4.0 publication to npm is still pending authentication; the registry continues to serve 0.3.0. TACO 0.4.0 is available in its GitHub repository and uses the same audited vendored Nachos archive as the app.

## Verified deployment

- [Nachos CI](https://github.com/marcuspuchalla/nachos/actions/runs/35641366452) passed on Node 18, 20, 22 and 24, including coverage.
- [TACO CI](https://github.com/marcuspuchalla/taco/actions/runs/35642895356) passed the Node and nine native adapter jobs. Nachos passed 3,195/3,195 operations and 46/46 catalog requirements, with zero bridge errors.
- [App CI](https://github.com/marcuspuchalla/cbor.app/actions/runs/35642891743) passed unit tests, typechecking, builds, preview browser tests and Docker-hosted browser tests.
- [cbor.app build identity](https://cbor.app/build-info.json) reports app and Nachos version 0.4.0. Coolify completed deployment of commit `7a7a9f99d18355b4d3fe3982d13d3eb905fdb36b`, and its production container is healthy.
- Four browser tests passed against `https://cbor.app`: real Cardano provenance/governance and WASM validation; exact redeemer and datum inspection; decoding, cancellation, export and PWA registration; and deep links, WASM responses and update metadata headers. The [test log](live-browser-tests.log) records the results.

The app now uses a tested Dockerfile with pinned Node and Nginx images. Coolify uses that Dockerfile. The initial Nixpacks deployment stalled during dependency installation; it was cancelled and superseded by the successful Dockerfile deployment. TACO's container runner now uses the host UID/GID so the restricted Linux container can update checkout-owned report files.

## Remaining registry publication

`npm whoami --registry=https://registry.npmjs.org` returned `401 Unauthorized`. Completing `npm login --auth-type=web --registry=https://registry.npmjs.org` on the release machine is required before publication can proceed.

The [prepared release archive](../../../artifacts/release/marcuspuchalla-nachos-0.4.0.tgz) has SHA-256 `7ac40cd1c57c1662111e5d60a980b78e7c9b24bfbcb98381108c8a9f596ea872`. Its only differences from the audited consumer archive are README.md and CHANGELOG.md; every other packaged file is byte-identical. A publish dry run passed.

After authentication: publish this exact archive, verify registry version and integrity, change both consumers to the exact registry dependency `@marcuspuchalla/nachos@0.4.0`, verify the installations, push the consumer lockfiles and observe the resulting deployment. No registry publication is claimed by this observation.

Exact commits, artifact hashes, CI links and the observed public build identity are in [verification.json](verification.json). The [original audit](../README.md) records the implementation and pre-release test baseline.
