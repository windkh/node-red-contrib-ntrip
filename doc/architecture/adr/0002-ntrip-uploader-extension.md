# ADR-0002: NTRIP uploader as full-replacement extension of the upstream client

## Status

Accepted in 0.2.0.

## Context

The upstream `ntrip-client` npm package implements the *download* side of
NTRIP only — it connects to a caster and emits received bytes. We needed the
*upload* side too: open a socket, send a SOURCE / POST handshake, then forward
locally-produced bytes to the caster (e.g. RTCM from an RTKBase station).

Four authentication-mode handshakes are commonly seen in the wild:

- `legacy` — `SOURCE <mp>` over plain TCP, rtk2go accepts this.
- `hybrid` — `SOURCE <mp>` plus a Basic Auth header. SNIP accepts this.
- `ntripv1` — `POST` over HTTP/1.0.
- `ntripv2` — `POST` over HTTP/1.1 with `Ntrip-Version: Ntrip/2.0`.

The upstream client's `_connect()` method handles only the download handshake.
Three options to add upload:

1. **Fork the upstream package.** Maintain a copy in this repo. Heavy
   maintenance burden.
2. **Submit a PR upstream.** Slow turn-around; upstream may not accept the
   shape we need.
3. **Subclass the upstream client locally** and override the connection method
   to write a different handshake. Light footprint.

## Decision

Subclass locally. [ntrip/lib/ntrip-client.js](../../../ntrip/lib/ntrip-client.js)
defines `NtripClientUploader extends NtripClient` and overrides `_connect()`
to emit the right handshake string per `authmode`.

The constructor also validates CR/LF in `mountpoint`/`username`/`password` to
prevent header injection — the rejection happens at instance construction so
malicious config never reaches the wire.

## Consequences

**Positive**

- No fork to maintain. Upstream upgrades flow through (`npm update`).
- All upload-specific logic is in one file, easy to audit.
- The CR/LF guard is co-located with the only code that interpolates those
  fields, minimising the chance of a future caller bypassing it.

**Negative**

- `_connect()` is a *full replacement*, not a delegation. Any improvement
  upstream makes to the connection lifecycle (timeout handling, IPv6, keep-
  alive, TLS upgrade) will not propagate into our uploader path.
- The subclass depends on internal-ish state of the parent (`this.client`,
  `this.timeout`, `_onError`, `_onData`). A breaking refactor upstream would
  surface as a runtime error in this package.
- The fork-by-extension makes a future TLS migration harder than it would be
  in a from-scratch implementation.

**Trade-offs**

- Picking this over a full fork chose *easy upstream upgrades* over *insulation
  from upstream API churn*. The upstream package has been stable for years, so
  the bet has paid off so far.

## Related

- Code: [ntrip/lib/ntrip-client.js:1-100](../../../ntrip/lib/ntrip-client.js#L1-L100)
- Referenced in: [Refactoring Recommendations §3](../refactoring-recommendations.md)
- Related ADRs: [ADR-0004](0004-stateful-handshake-interception.md) (handshake state machine sits on top of this subclass)
