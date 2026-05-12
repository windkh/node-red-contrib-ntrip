# ADR Index

This folder contains Architecture Decision Records. One file per ADR, numbered
in the order they were accepted.

| # | Title | Status | Date accepted |
|---|-------|--------|---------------|
| [0001](0001-single-registration-file.md) | Single registration file for all nodes | Accepted | original design |
| [0002](0002-ntrip-uploader-extension.md) | NTRIP uploader as full-replacement extension of the upstream client | Accepted | 0.2.0 |
| [0003](0003-two-output-decoder-design.md) | Two-output `[ok, error]` convention for decoders / encoder | Accepted | original design (reaffirmed in 0.2.6) |
| [0004](0004-stateful-handshake-interception.md) | Stateful handshake interception in the NtripClient | Accepted | 0.2.5 |
| [0005](0005-rtcm-partial-frame-buffer.md) | Carry-over buffer for partial RTCM frames | Accepted | 0.2.5 |
| [0006](0006-nmea-multi-sentence-split.md) | Multi-sentence splitting in the NMEA decoder | Accepted | 0.2.5 |
| [0007](0007-mocha-test-helper-stack.md) | Mocha + node-red-node-test-helper for the test suite | Accepted | 0.2.6 |
| [0008](0008-coordinate-gating-sentinel.md) | `(0, 0, 0)` as the "no location" sentinel for GGA emission | Accepted | 0.2.5 |

See [../architecture-decisions.md](../architecture-decisions.md) for the
template and the criteria for when to add a new ADR.
