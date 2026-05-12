# Architecture Decisions

This chapter is the index of Architecture Decision Records (ADRs). Each
individual ADR is stored as its own markdown file under [adr/](adr/) and
follows a compact template (Status / Context / Decision / Consequences /
Related).

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](adr/0001-single-registration-file.md) | Single registration file for all nodes | Accepted |
| [0002](adr/0002-ntrip-uploader-extension.md) | NTRIP uploader as full-replacement extension of the upstream client | Accepted |
| [0003](adr/0003-two-output-decoder-design.md) | Two-output `[ok, error]` convention for decoders / encoder | Accepted |
| [0004](adr/0004-stateful-handshake-interception.md) | Stateful handshake interception in the NtripClient | Accepted |
| [0005](adr/0005-rtcm-partial-frame-buffer.md) | Carry-over buffer for partial RTCM frames | Accepted |
| [0006](adr/0006-nmea-multi-sentence-split.md) | Multi-sentence splitting in the NMEA decoder | Accepted |
| [0007](adr/0007-mocha-test-helper-stack.md) | Mocha + node-red-node-test-helper for the test suite | Accepted |
| [0008](adr/0008-coordinate-gating-sentinel.md) | `(0, 0, 0)` as the "no location" sentinel for GGA emission | Accepted |

## When to add a new ADR

Add one when a decision is non-obvious and would surprise a contributor reading
the code six months from now. Typical signals:

- The code does something differently from how upstream / community examples
  do it.
- The choice was load-bearing — reverting it would break a documented contract.
- There is a clear trade-off (e.g. simpler code vs. larger memory footprint)
  that future maintainers should understand before changing direction.

## When *not* to add an ADR

Skip the formality for routine bug fixes, refactors that don't change external
behaviour, or decisions that are already obvious from idiomatic style. The
goal is a small, stable archive — not a write-up of every commit.

## Template

```markdown
# ADR-NNNN: Short imperative title

## Status
Proposed | Accepted | Superseded by ADR-MMMM | Deprecated

## Context
What problem are we solving? What constraints / forces are at play?

## Decision
What we are going to do, in one or two sentences.

## Consequences
- Positive: …
- Negative: …
- Trade-offs: …

## Related
- Code: [path/to/file.js:LL-LL](../../path/to/file.js#LLL-LLL)
- ADRs: [[ADR-XXXX](XXXX-title.md)]
```
