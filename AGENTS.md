# AGENTS.md — node-red-contrib-ntrip

<!-- BEGIN node-red-standards:managed (do not edit — run `nrstd sync`) -->

> These shared rules are maintained centrally in **node-red-standards** and refreshed here by
> `nrstd sync`. Do not edit between the managed markers — change the standard instead. Everything
> below the managed block (the "Project-specific rules" section) is yours and is never overwritten.

## Shared: Architecture
- Node packages are modular: `lib/` holds framework-independent, unit-testable core logic;
  `nodes/` holds one file per Node-RED node; `icons/` holds node icons.
- The registered entry file (`<pkg>/99-<name>.js`) is a thin delegator that only `require`s and
  registers the modules in `nodes/`. Keep runtime glue thin.
- Record non-trivial design decisions as an ADR in `doc/architecture/adr/`.

## Shared: Code style
- Lint: ESLint flat config (`eslint.config.js`), ESLint >= 9. Run the lint script before committing.
- Format: Prettier (`.prettierrc.json`) — 4-space indent, single quotes, es5 trailing commas.
- Target Node.js >= 20.
- Avoid `var` — use `const`, or `let` only when the binding is reassigned (enforced by `no-var` / `prefer-const`).
- One statement per line — don't pack multiple instructions onto a single line; keep lines simple to read (enforced by `max-statements-per-line`).
- Single exit — each function has exactly one `return`, placed as its final statement; avoid early or multiple returns.

## Shared: Tests
- Node's built-in test runner (`node --test`) + `node-red-node-test-helper`. Tests live in `test/` as `*.test.js`.
  Import `{ describe, it }` from `node:test` and assert with `node:assert`. Coverage via `c8`.

## Shared: Documentation
- `README.md` is user-facing. Architecture docs live under `doc/architecture/`
  (`overview.md`, `structural-design.md`, `behavioural-design.md`, `adr/`).
- Update `CHANGELOG.md` (Keep a Changelog style) for every user-visible change; bump the
  patch version in `package.json` in the same commit.

## Shared: Workflow
- CI (`.github/workflows/node.js.yml`) must pass: lint, format:check, test, coverage.
- Releases go through `.github/workflows/npm-publish.yml`.
- Never bump the major version without an ADR explaining the breaking change.

## Shared: package.json scripts
`lint`, `lint:fix`, `format`, `format:check`, `test` (`node --test` with `--test-force-exit --test-timeout=30000 --test-concurrency=1`, no path args), `coverage` / `coverage:check` (c8 over `npm test`).

<!-- END node-red-standards:managed -->

## Project-specific rules

## Project overview

`node-red-contrib-ntrip` provides five Node-RED nodes: `NtripClient`
(download/upload), `RtcmDecoder`, `RtcmEncoder`, `NmeaDecoder`, and
`NmeaEncoder`. Published to npm; consumed via Node-RED's palette manager — no
application entry of its own.

## Commands

Standard scripts as declared in [AGENTS.md § Standard package.json scripts](AGENTS.md#standard-packagejson-scripts). Common:

```bash
npm test                                       # node --test + node-red-node-test-helper
npm run lint                                   # eslint (flat config)
npm run format:check                           # prettier
npm run coverage                               # c8 node --test

node --test test/nmea-decoder.test.js          # run one file
node --test --test-name-pattern regression     # only regression specs
```

To exercise a change in a live Node-RED:

```bash
cd <node-red userDir, e.g. ~/.node-red>
npm install <path-to-this-repo>
```

Then import a flow from [examples/](examples/) — `ntripclient.json`, `sapos.json`, `upload.json`, `tcp.json`, `nmea-decode.json`, `nmea-encode.json`, `rtcm-encode.json`, `watchdog.json`.

## Architecture (ntrip-specific)

Node-RED contrib structure this repo conforms to:

- [package.json](package.json) `node-red.nodes` points at a single registration file [ntrip/99-ntrip.js](ntrip/99-ntrip.js).
- That file is the only entry Node-RED loads. It `require`s each node from [ntrip/nodes/](ntrip/nodes/) and calls `RED.nodes.registerType(...)`.
- Each node is a pair: a `.js` runtime file in [ntrip/nodes/](ntrip/nodes/), plus editor UI (HTML + inline `<script>`/`<template>`) co-located in [ntrip/99-ntrip.html](ntrip/99-ntrip.html). All five nodes share this one HTML file.
- Credentials (NTRIP username/password) are declared in **both** the registration call ([ntrip/99-ntrip.js](ntrip/99-ntrip.js)) and the HTML `credentials` block — they must stay in sync, otherwise Node-RED will not persist them.

Node responsibilities:

- **NtripClient** ([ntrip/nodes/ntrip-client-node.js](ntrip/nodes/ntrip-client-node.js)) — wraps [ntrip/lib/ntrip-client.js](ntrip/lib/ntrip-client.js), which extends the upstream `ntrip-client` package to add an *uploader* variant and an exponential reconnect backoff (`1 s`, `2 s`, `5 s`, `10 s`, capped at the last entry; resets on `ICY 200 OK` handshake). The uploader's `_connect()` switches the handshake string by `authmode` (`legacy`, `hybrid`, `ntripv1`, `ntripv2`). Inbound handshake replies (`ICY 200 OK`, `ICY 406`, `SOURCETABLE 200 OK`) are intercepted only while `connected` is false. `msg.payload = [x, y, z]` triggers `client.setXYZ(...)`; anything else is written to the caster. Status badge shows `<rate> Rx N Tx M` with 1 s bps sampling.
- **RtcmDecoder** ([ntrip/nodes/rtcm-decoder-node.js](ntrip/nodes/rtcm-decoder-node.js)) — loops `RtcmTransport.decode(buffer)` from `@gnss/rtcm`, keeping a `pendingBuffer` across input events so frames straddling TCP boundaries are reassembled. Two outputs: `[ok, error]`.
- **RtcmEncoder** ([ntrip/nodes/rtcm-encoder-node.js](ntrip/nodes/rtcm-encoder-node.js)) — accepts an `RtcmMessage` instance directly, or `msg.payload.message` from the decoder. Calls `RtcmTransport.encode` into a pre-allocated 1029-byte buffer. Two outputs: `[ok, error]`.
- **NmeaDecoder** ([ntrip/nodes/nmea-decoder-node.js](ntrip/nodes/nmea-decoder-node.js)) — splits `\r?\n`-delimited chunks and decodes each sentence via `NmeaTransport.decode`. Accepts Buffer or string; error output preserves the original `rawInput` untouched. Two outputs: `[ok, error]`.
- **NmeaEncoder** ([ntrip/nodes/nmea-encoder-node.js](ntrip/nodes/nmea-encoder-node.js)) — accepts `{ messageType, nmeaMessage }` or an already-constructed `NmeaMessage` instance (passthrough). Large `switch (messageType)` maps to `NmeaMessage*.construct(...)`. When adding a new sentence type, add both the destructured import at the top and the matching `case`.

## Tests

Specs live in [test/](test/) — one file per node, all `*.test.js`. Uses `node:test` + `node:assert` and loads the registration file via `node-red-node-test-helper`.

Known-good test fixtures used across specs:

- NMEA: `$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47`, `$GPGLL,4916.45,N,12311.12,W,225444,A,*1D`
- RTCM: real 25-byte type 1005 frame as hex `D300133ED7D30202980EDEEF34B4BD62AC0941986F33360B98`

Two conventions to reuse when adding tests:

- **`(regression: ...)` in the test name** — for any spec that locks in a previously-shipped bug. Filter with `node --test --test-name-pattern regression`.
- **`node.error` spy** — replace `n1.error` with a wrapper that flips a boolean, then assert it stayed false. Prevents regressing the "decoder floods the Node-RED error log when fed mismatched binary" bug.

NtripClient integration tests are not yet written; the recommended approach is a fake TCP server via `net.createServer` that returns `"ICY 200 OK\r\n\r\n" + rtcmBytes` to exercise the handshake state machine.

## Conventions

- All nodes follow the same pattern: increment a `messagesReceived`/`invalidMessagesReceived` counter and call `node.status({...})` after each input, clear via `node.status({})` on `close`.
- The package version printed at load time is read from `package.json` at [ntrip/99-ntrip.js](ntrip/99-ntrip.js) — bumping `version` in `package.json` is the only source of truth.
- Releases are tracked in [CHANGELOG.md](CHANGELOG.md) using "Keep a Changelog" headings.
- Detailed architecture chapters (Overview, Structural Design, Behavioural Design, ADRs, Statistics) live under [doc/architecture/](doc/architecture/). Update those alongside behavioural changes.
