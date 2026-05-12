# Errors and Weaknesses

This chapter inventories known limitations. Items are grouped by severity and
labelled by status (Open / Fixed-in-vX.Y.Z / Accepted as design constraint).

## Critical

| ID | Description | Status |
|----|-------------|--------|
| C-1 | `NmeaEncoder` instance passthrough was broken (`input.prototype instanceof NmeaMessage` always false) | Fixed in 0.2.4 |
| C-2 | `NmeaEncoder` catch block referenced an out-of-scope `input`, crashing on every encoder failure | Fixed in 0.2.4 |
| C-3 | `NtripClient` crashed at construction when `mode` was neither `download` nor `upload` (`client.on('data',…)` on `undefined`) | Fixed in 0.2.5 |
| C-4 | `RtcmDecoder` dropped any partial frame at TCP packet boundaries (no carry-over) | Fixed in 0.2.5 |
| C-5 | `NmeaDecoder` only decoded the first sentence of a multi-sentence chunk despite documentation claiming otherwise | Fixed in 0.2.5 |
| C-6 | `NmeaDecoder` and `RtcmDecoder` called `node.error()` for every decode failure — flooded the Node-RED log when fed mismatched binary (the README's own demo wiring) | Fixed in 0.2.6 |
| C-7 | `NmeaDecoder` error output stored the `toString`-converted form on `input`, losing the original `Buffer` | Fixed in 0.2.6 |

## High

| ID | Description | Status |
|----|-------------|--------|
| H-1 | Always-on handshake check on every data packet — risked dropping RTCM bytes that shared a TCP segment with the `ICY 200 OK` reply | Fixed in 0.2.5 |
| H-2 | Coordinate guard `x && y && z` silently dropped axis-aligned positions (e.g. equator) | Fixed in 0.2.5 |
| H-3 | `NmeaEncoder` unknown `messageType` silently emitted `nmeaMessage: undefined` on the success output | Fixed in 0.2.4 |
| H-4 | `client.write` rejection errors were not visible (async — not caught by the surrounding `try`) | **Open.** Async write failures now surface via the socket `error` listener, but no per-input error feedback. |
| H-5 | RTCM/NMEA decoder loop had no zero-length-progress guard — theoretical infinite loop | Fixed in 0.2.5 |

## Medium

| ID | Description | Status |
|----|-------------|--------|
| M-1 | Password input rendered as `type="text"` in the editor form | Fixed in 0.2.5 |
| M-2 | CR/LF injection possible via `mountpoint`/`username`/`password` (interpolated into the handshake string) | Fixed in 0.2.5 — rejected at construct time |
| M-3 | `AggregateError` referenced unconditionally; ReferenceError on Node ≤ 14 | Fixed in 0.2.5 — `typeof` guard, and `engines.node` bumped to ≥ 18 |
| M-4 | `host` accepted as `""`/`null`; `interval` forwarded as a raw string | Fixed in 0.2.5 |
| M-5 | Counter `messagesReceived` mixed inbound, outbound, and handshake replies | Fixed in 0.2.5 — split into `Rx`/`Tx` |
| M-6 | No connection-state event on the `NtripClient` output — downstream flows can only react to the status badge text | **Open.** See [Future Improvements](future-improvements.md). |
| M-7 | Listener leaks on `client.close()` — accumulated across reconnects | Fixed in 0.2.5 — `removeAllListeners` on close |

## Low

| ID | Description | Status |
|----|-------------|--------|
| L-1 | `engines.node: ">=7.6.0"` was inconsistent with code that uses `AggregateError` and the CI matrix (18/20/22) | Fixed in 0.2.5 — bumped to `>=18.0.0` |
| L-2 | Editor help text was stubs (`<p>.</p>`) for three of four nodes | Fixed in 0.2.6 — full `<dl class="message-properties">` blocks |
| L-3 | Decoders/encoder kept the original input attached to every output message (memory pressure for high-rate streams) | **Open.** Cost is one Buffer reference per emission. |
| L-4 | `'socket timeouted'` typo in the upstream socket error message | Fixed in 0.2.5 |
| L-5 | NMEA case `'Object'` was unreachable because `messageType.toUpperCase()` ran first | Fixed in 0.2.4 |

## Open design-level constraints

These are *accepted* limitations — documented rather than fixed, because the
fix would be a significant architectural change.

- **NTRIP over plaintext TCP only.** No NTRIPS / TLS support. NTRIP V2 over TLS
  is a real protocol but the upstream `ntrip-client` package does not implement
  it, and this contrib does not bring its own transport layer. See
  [Future Improvements](future-improvements.md).
- **`_connect()` full replacement** (not delegation) in
  [ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js). Improvements to
  the upstream client's connection logic (keep-alive, IPv6 handling, TLS
  upgrade) won't propagate into the uploader path. See
  [ADR-0002](adr/0002-ntrip-uploader-extension.md).
- **`credentials` block must be declared in two places** — both the JS
  `registerType` and the HTML `RED.nodes.registerType`. Drift is detectable
  only at runtime when persistence silently fails.
- **No per-node integration tests for `NtripClient`** — the unit test stack
  covers the three pure transformer nodes only. The client requires a fake TCP
  server for meaningful testing; see [Future Improvements](future-improvements.md).
- **Editor HTML help text duplicates much of the runtime documentation** — any
  schema change to a `payload` shape needs two updates (code + help text).
