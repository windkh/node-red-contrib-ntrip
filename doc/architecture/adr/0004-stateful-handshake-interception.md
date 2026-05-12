# ADR-0004: Stateful handshake interception in the NtripClient

## Status

Accepted in 0.2.5.

## Context

The NTRIP caster replies to a successful connection with one of:

- `ICY 200 OK\r\n\r\n` followed immediately by the correction stream.
- `ICY 406 ...\r\n\r\n` (rejected — bad credentials, etc.).
- `SOURCETABLE 200 OK\r\n\r\n` followed by the source table (returned when the
  client did not specify a mountpoint, or specified an invalid one).

These first-byte replies need to drive the node's status badge: green
"connected", red "rejected", red "no mountpoint". After the handshake is
processed, all subsequent bytes are application data (RTCM in download mode,
mountpoint advertisements in upload reverse channel).

Up to 0.2.4 the `'data'` listener ran `data.toString().startsWith('ICY 200 OK')`
on every incoming chunk. This was wrong for two reasons:

1. **The check inflated the message counter.** Each control reply bumped
   `messagesReceived`, polluting the status badge.
2. **It could drop RTCM bytes.** TCP is byte-stream — when the caster sent
   `"ICY 200 OK\r\n\r\n" + firstRtcmFrame` in one segment, the prefix match
   succeeded and the whole chunk (including the RTCM tail) was discarded
   instead of forwarded.

## Decision

Maintain a `connected: boolean` flag on the node instance. The `'data'`
listener checks the flag:

- **`!connected`** — look at the first ~64 bytes of the chunk for an `ICY`
  or `SOURCETABLE` prefix. If found, update status accordingly and consume the
  handshake. If `ICY 200 OK` was found, also split at `\r\n\r\n` and forward
  the trailing bytes as the first real data frame. Either way, set
  `connected = true` (or, for rejection paths, leave `connected = false` and
  log the error).
- **`connected`** — every byte is application data; just forward it and bump
  the counter.

The flag is reset to `false` on the `'close'` event so the next reconnect
re-enters the handshake state.

## Consequences

**Positive**

- No byte loss at the handshake boundary.
- Counter reflects application data only.
- Behaviour after reconnect matches behaviour on first connect — no special
  case for reconnects.

**Negative**

- Two paths in the data listener that future maintainers must keep aligned.
- A spec for the trailing-bytes split would need a fake caster — currently
  covered by manual testing only. See
  [Future Improvements](../future-improvements.md).

**Trade-offs**

- Choosing a state-machine over a "stateless prefix check every time" approach
  trades minimal code complexity (one extra boolean) for correct behaviour on
  the boundary case.

## Related

- Code: [ntrip/nodes/ntrip-client-node.js:75-115](../../../ntrip/nodes/ntrip-client-node.js#L75-L115)
- CHANGELOG: 0.2.5 "Fixed NTRIP client node — Handshake detection is now stateful"
- Related ADRs: [ADR-0002](0002-ntrip-uploader-extension.md) (the underlying client this layer sits on)
