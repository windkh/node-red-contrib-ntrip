# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`node-red-contrib-ntrip` is a Node-RED contribution package providing four GNSS-related nodes: an NTRIP client (download/upload), an RTCM decoder, an NMEA decoder, and an NMEA encoder. It is published to npm and consumed by users via Node-RED's palette manager — there is no application entry point of its own. Runtime target is Node.js >= 7.6 (CI matrix: 18.x, 20.x, 22.x).

## Commands

This package has no build step. Linting (ESLint flat config) and formatting (Prettier) are wired in:

```bash
npm test                                  # run all specs (mocha + node-red-node-test-helper)
npm run lint                              # eslint, treats warnings as warnings
npm run lint:fix                          # eslint --fix
npm run format                            # prettier --write .
npm run format:check                      # prettier --check . (used in CI)

npx mocha test/nmea-decoder.spec.js       # run one spec file
npx mocha test/**/*.spec.js -g 'regression'  # run only regression specs
```

CI runs `npm ci`, `npm run build --if-present`, `npm run lint`, `npm run format:check`, then `npm test` across Node 18/20/22 (see [.github/workflows/node.js.yml](.github/workflows/node.js.yml)).

Prettier settings live in [.prettierrc.json](.prettierrc.json) (4-space indent, single quotes, trailing-commas-es5, printWidth 160). [.prettierignore](.prettierignore) skips `examples/` (Node-RED flow files), `ntrip/99-ntrip.html` (Node-RED-specific structural conventions), markdown, and `doc/`. ESLint config is [eslint.config.js](eslint.config.js) (flat config, `@eslint/js` recommended + `eslint-config-prettier`).

To exercise changes manually, install this directory into a local Node-RED:

```bash
cd <node-red userDir, e.g. ~/.node-red>
npm install <path-to-this-repo>
```

Then start Node-RED and import a flow from [examples/](examples/) (e.g. `ntripclient.json`, `sapos.json`, `upload.json`, `tcp.json`, `nmea-decode.json`, `nmea-encode.json`) to drive the nodes against a real NTRIP caster.

## Architecture

Node-RED contribution packages follow a strict structure that this repo conforms to:

- [package.json](package.json) `node-red.nodes` points at a single registration file [ntrip/99-ntrip.js](ntrip/99-ntrip.js).
- That registration file is the only entry Node-RED loads. It `require`s each node implementation from [ntrip/nodes/](ntrip/nodes/) and calls `RED.nodes.registerType(...)` for each.
- Each Node-RED node is a pair: a `.js` runtime file in [ntrip/nodes/](ntrip/nodes/), plus the editor UI (HTML + inline `<script>`/`<template>`) co-located in [ntrip/99-ntrip.html](ntrip/99-ntrip.html). All four nodes' editor definitions share this single HTML file.
- Credentials (NTRIP username/password) are declared in both the registration call ([ntrip/99-ntrip.js:13-16](ntrip/99-ntrip.js#L13-L16)) and the HTML `credentials` block — they must stay in sync, otherwise Node-RED will not persist them.

Node responsibilities:

- **NtripClient** ([ntrip/nodes/ntrip-client-node.js](ntrip/nodes/ntrip-client-node.js)) — wraps [ntrip/lib/ntrip-client.js](ntrip/lib/ntrip-client.js), which extends the upstream `ntrip-client` package to add an *uploader* variant. The uploader's `_connect()` switches the handshake string by `authmode` (`legacy`, `hybrid`, `ntripv1`, `ntripv2`) — see [ntrip/lib/ntrip-client.js:45-66](ntrip/lib/ntrip-client.js#L45-L66). Special inbound bytes are intercepted and turned into status/error rather than forwarded: `ICY 200 OK` (connected), `ICY 406` (rejected), `SOURCETABLE 200 OK` (mountpoint missing). When `msg.payload` is an `Array`, it is treated as an `[x, y, z]` coordinate triple and forwarded via `client.setXYZ(...)` (used by the Sapos flow to seed a GGA sentence); any other payload is written to the caster. `passthrough` controls whether written data is also re-emitted on the output.
- **RtcmDecoder** ([ntrip/nodes/rtcm-decoder-node.js](ntrip/nodes/rtcm-decoder-node.js)) — loops `RtcmTransport.decode(buffer)` (from `@gnss/rtcm`), slicing the buffer by the returned `length` until empty, emitting one message per decoded RTCM frame. Two outputs: `[ok, error]`.
- **NmeaDecoder** ([ntrip/nodes/nmea-decoder-node.js](ntrip/nodes/nmea-decoder-node.js)) — decodes via `NmeaTransport.decode` from `@gnss/nmea`. Accepts either a Buffer or a string, and either `msg.payload` directly or `msg.payload.nmeaMessage`. Two outputs: `[ok, error]`.
- **NmeaEncoder** ([ntrip/nodes/nmea-encoder-node.js](ntrip/nodes/nmea-encoder-node.js)) — symmetric inverse, with a large `switch (messageType)` that maps NMEA sentence types (`GGA`, `RMC`, `GSV`, ...) to the corresponding `NmeaMessage*.construct(...)` factory before calling `NmeaTransport.encode`. When adding support for a new NMEA sentence type, add both the import at the top and the matching `case` in the switch.

## Tests

Specs live in [test/](test/) — one file per node. Each uses `node-red-node-test-helper` to load the registration file [ntrip/99-ntrip.js](ntrip/99-ntrip.js), wires the node under test to two `helper` sink nodes (one per output port), and asserts on `msg.payload` shape.

Two patterns to reuse when adding tests:

- **`regression:` tag in the test name** — for any spec that locks in a previously-shipped bug. Future maintainers can run `mocha -g regression` to verify the fix is still in place.
- **`node.error` spy** — replace `n1.error` with a wrapper that flips a boolean, then assert the boolean stayed false. Used to prevent regressing the "decoder floods the Node-RED error log when fed mismatched binary" bug.

Known-good test fixtures embedded in the specs:

- NMEA: `$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47`, `$GPGLL,4916.45,N,12311.12,W,225444,A,*1D`
- RTCM: a real 25-byte type 1005 frame as hex `D300133ED7D30202980EDEEF34B4BD62AC0941986F33360B98`

NTRIP client integration tests are not yet written; the recommended approach is a fake TCP server via `net.createServer` that returns `"ICY 200 OK\r\n\r\n" + rtcmBytes` to exercise the handshake-state machine.

## Conventions worth knowing

- All four nodes follow the same pattern: increment a `messagesReceived`/`invalidMessagesReceived` counter and call `node.status({...})` after each input, set `node.status({})` on `close`. Keep this consistent when adding nodes.
- The package version printed at load time is read from `package.json` at [ntrip/99-ntrip.js:8-9](ntrip/99-ntrip.js#L8-L9) — bumping `version` in package.json is the only source of truth.
- Releases are tracked in [CHANGELOG.md](CHANGELOG.md) using "Keep a Changelog" headings; each entry typically references the GitHub issue number that motivated it.
