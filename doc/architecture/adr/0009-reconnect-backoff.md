# ADR-0009: Exponential-schedule reconnect backoff on the NTRIP client

## Status

Accepted in 0.2.10.

## Context

The upstream `ntrip-client` package reconnects on socket close/error with a
**fixed** `reconnectInterval` (default 2 000 ms). When a caster went down for
a while — a DNS outage, a maintenance window, or a hard mountpoint disable —
this contrib produced two visible problems:

1. **Node-RED `[error]` log flood.** The library emits an `error` event on
   every failed reconnect. The `NtripClient` node forwards those via
   `node.error(...)`. At 2 s intervals that's 30 lines per minute.
2. **Traffic against the caster.** A rejected client that retries every 2 s
   in a loop is textbook "please block me" behaviour. Some casters have
   IP-level rate limiting; rtk2go's TOS is explicit about it.

The user reported both in an issue. Requested schedule was `1 s → 2 s → 5 s
→ 10 s`, then hold at `10 s`, resetting to `1 s` on successful reconnect.

Options considered:

- **Patch upstream.** Slow, wouldn't help until an upstream release ships,
  and the upstream project's cadence is slow.
- **Local subclass overriding `_reconnect`.** Zero upstream change; sits on
  top of the existing extension pattern we already use for the uploader.
- **Replace `ntrip-client` with a from-scratch client.** Overkill.

## Decision

Introduce `NtripClientWithBackoff extends NtripClient` in
[ntrip/lib/ntrip-client.js](../../../ntrip/lib/ntrip-client.js). It:

- Overrides `_reconnect()` to walk `[1000, 2000, 5000, 10000]` (in ms),
  capped at the last entry. The parent's `_reconnect` still handles the
  actual sleep+connect, so the override just sets `this.reconnectInterval`
  before delegating.
- Overrides `_onData(data)` to detect the transition
  `isReady: false → true` (i.e. the caster's `ICY 200 OK` handshake
  succeeded) and reset the backoff index to 0.

Both `createDownloader` and `createUploader` return instances of this class
(the uploader further extends it), so the schedule applies uniformly.

## Consequences

**Positive**

- Idle-error log volume drops by ~5× within the first minute of an outage
  and by ~5× at steady state (2 s → 10 s cap).
- Fewer connect attempts against a dead caster — less risk of IP bans.
- A brief blip (e.g. a router reboot) still recovers within 1 s of the
  caster coming back, because the backoff resets on successful handshake.

**Negative**

- Longer worst-case reconnect on a caster that flaps — up to 10 s of no
  data even after the caster is back, until the next scheduled attempt.
- Adds one more subclass to the local extension chain
  (`NtripClient → NtripClientWithBackoff → NtripClientUploader`). Any
  future upstream `_reconnect` change might collide.

**Trade-offs**

- Chose **linear-plus-cap** over an exponential like `1, 2, 4, 8, 16, …`
  because unlimited exponential means a caster recovery after 10 minutes
  can be 8+ minutes late. Capping at 10 s bounds the worst-case
  time-to-recovery to 10 s.

## Related

- Code: [ntrip/lib/ntrip-client.js](../../../ntrip/lib/ntrip-client.js) — the
  `NtripClientWithBackoff` class.
- CHANGELOG: 0.2.10 "NtripClient — Reconnect attempts now use an
  exponential-ish backoff schedule …".
- Related ADRs:
  [ADR-0002](0002-ntrip-uploader-extension.md) (established the
  local-subclass pattern that this decision builds on).
