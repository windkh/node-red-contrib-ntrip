# Changelog
All notable changes to this project will be documented in this file.

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
