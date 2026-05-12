# Changelog
All notable changes to this project will be documented in this file.

## [0.2.6]
### Fixed regressions introduced in 0.2.5
- RTCM and NMEA decoders no longer call `node.error()` on decode failures. Decode failures still go to the second (error) output, but they no longer flood the Node-RED `[error]` log when a binary stream is intentionally piped through the "wrong" decoder (e.g. RTCM bytes through the NMEA decoder — the demo flow ships with this wiring).
- NMEA decoder error output now preserves the original payload on `input` (a `Buffer` if a `Buffer` was supplied) and exposes the utf8 string form as `inputString`, matching pre-0.2.5 behavior.

### Documentation
- Completed the per-node help text in the Node-RED info sidebar for all four nodes (`NtripClient`, `RtcmDecoder`, `NmeaDecoder`, `NmeaEncoder`) — configuration parameters, input/output shapes, status legend.
- README updated: Requirements section (Node.js >= 18), corrected NMEA decoder output schema (`nmeaMessage`, not `message`), new NMEA Encoder section with the full list of supported `messageType` values, a "Notes on usage" section covering the common gotchas (two-output design, coordinate gating, dynamic `setXYZ` injection, pass-through interleaving, plaintext transport), and a number of typo fixes.

## [0.2.5]
### Fixed NTRIP client node
- Unsupported `mode` no longer crashes the node with `client is undefined`; it now logs an error and stops cleanly.
- Handshake detection (`ICY 200 OK`, `ICY 406`, `SOURCETABLE 200 OK`) is now only checked while the connection is not yet established, and any RTCM bytes that arrive in the same TCP segment as the `ICY 200 OK` reply are now forwarded instead of dropped.
- Coordinate guard changed from `x && y && z` to `not all zero`, so coordinates on an axis (e.g. equator) are no longer silently dropped. Non-finite values are rejected.
- Separate Rx/Tx counters; handshake replies no longer inflate the inbound message count.
- `host` is validated as a non-empty trimmed string; `interval` is coerced to an integer.
- `AggregateError` reference is now guarded by a `typeof` check.
- `client.removeAllListeners()` is called on node close to prevent listener leaks across reconnects.
- Status badge no longer passes raw Error objects where a string is expected.
- Removed pointless `async` on the input handler.

### Fixed RTCM decoder node
- Frames that straddle TCP packet boundaries are now buffered across input events instead of being dropped on a decode error.
- Added a zero-length / non-positive-length guard to prevent a potential infinite loop.
- Decode failures now propagate to `node.error` so Catch nodes can react.

### Fixed NMEA decoder node
- A single chunk containing multiple `\r\n`-delimited NMEA sentences is now decoded sentence by sentence (previously only the first sentence was parsed).
- Non-string / non-Buffer payloads are routed to the error output instead of crashing.
- Decode failures now propagate to `node.error` so Catch nodes can react.

### Fixed NTRIP client library wrapper
- Rejects CR/LF in `mountpoint`, `username`, and `password` to prevent handshake header injection.
- Fixed `'socket timeouted'` typo in timeout error message.

### Fixed editor UI
- Password field is now rendered with `type="password"` instead of `type="text"`.
- `host` and `mountpoint` are validated as non-empty strings in the configuration dialog.

### Other
- Bumped `engines.node` from `>=7.6.0` to `>=18.0.0` to match the CI matrix and the actual runtime requirements (`AggregateError`, optional chaining, etc.).

## [0.2.4]
### Fixed NMEA encoder node
- Restored `NmeaMessage` instance passthrough (the `instanceof` check was previously inspecting `input.prototype` and always evaluated to false).
- Replaced unguarded property access with a payload validation guard so missing `nmeaMessage`/`messageType` is routed to the error output instead of throwing.
- Fixed `ReferenceError` in the catch and invalid-input branches that referenced an out-of-scope `input` variable.
- Unknown `messageType` values are now routed to the error output instead of silently emitting `nmeaMessage: undefined` on the success output.
- `case 'Object'` renamed to `case 'OBJECT'` (the preceding `toUpperCase()` made the original case unreachable).
- Status badge now turns red when a message fails to encode.
- `messageType` is coerced to a string before `toUpperCase()` to tolerate non-string inputs.

## [0.2.3]
### Added NMEA encoder node - [#13](https://github.com/windkh/node-red-contrib-ntrip/issues/13)

## [0.2.2]
### Added documentation - [#3](https://github.com/windkh/node-red-contrib-ntrip/issues/3)

## [0.2.1]
### Added several auth modes for uploading data to the caster.
###  added pass through mode - [#10](https://github.com/windkh/node-red-contrib-ntrip/issues/10)

## [0.2.0]
### Refactored nodes: data can be forwarded to NTRIP caster now.

## [0.1.2]
### Fixed readme

## [0.1.1]
### Minor tweaks

## [0.1.0]
### Initial version

**Note:** The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
