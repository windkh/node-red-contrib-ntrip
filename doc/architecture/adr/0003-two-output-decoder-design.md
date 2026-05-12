# ADR-0003: Two-output `[ok, error]` convention for decoders / encoder

## Status

Accepted in the original design, **reaffirmed in 0.2.6** after a brief
deviation in 0.2.5 that added `node.error()` calls inside the catch blocks.

## Context

Each of `RtcmDecoder`, `NmeaDecoder`, `NmeaEncoder` can fail per message —
unexpected payload type, malformed bytes, unknown sentence/message ID. There
are two idiomatic Node-RED patterns to report such failures:

- **`node.error(err, msg)`** — logs to the Node-RED `[error]` log and, with the
  `msg` second argument, hands the message off to any wired Catch node.
- **A second output port** — `node.send([okMsg, errMsg])`. Flows wire the
  second port to a debug node, MQTT publish, in-memory queue, etc.

Both are legitimate. The choice matters when the decoder is fed high-rate
mismatched binary — for example, the README's own demo flow wires an
`NmeaDecoder` onto an `NtripClient` download output as an illustration of
"the stream can be split", even though RTK2Go only emits RTCM. Every byte that
arrives produces a NMEA decode failure.

In 0.2.5 the catch blocks called both `node.send` *and* `node.error`. Users
running the demo immediately saw a flood of:

```
12 May 19:20:21 - [error] [NmeaDecoder:fa8…] Error: NMEA decode exception: Invalid delimiter (expected $ or !, got �)
```

— one per chunk, several per second. The log became unusable.

## Decision

Per-message decode failures are reported on the **second output only**, never
via `node.error`. `node.error` is reserved for unhandled-state conditions
(node construction failure, unsupported configuration) where the node can no
longer make forward progress.

If a downstream flow wants centralised error handling, it should wire the
second output to its own Catch-equivalent — typically a Function node that
logs and forwards.

## Consequences

**Positive**

- Decoders fed mismatched binary stop polluting the Node-RED error log.
- The error output port is opt-in: ignore it and errors are silently dropped
  (the decoder still bumps `invalidMessagesReceived` and updates the status
  badge, so the user can tell from the editor that something is wrong).
- Behaviour is consistent across all three transformer nodes.

**Negative**

- Users coming from packages that use `node.error` for everything need to wire
  the second output explicitly — a small learning-curve cost.
- The Catch-node integration that `node.error` provides is lost. A workaround
  is to chain a Function node that calls `node.error()` if the user wants
  Catch firing.

**Trade-offs**

- This favours **operability over discoverability** — a quiet error log is
  more important than out-of-the-box Catch integration, given the documented
  demo wiring.

## Related

- Code: [ntrip/nodes/nmea-decoder-node.js:33-42](../../../ntrip/nodes/nmea-decoder-node.js#L33-L42), [ntrip/nodes/rtcm-decoder-node.js:35-55](../../../ntrip/nodes/rtcm-decoder-node.js#L35-L55), [ntrip/nodes/nmea-encoder-node.js:155-166](../../../ntrip/nodes/nmea-encoder-node.js#L155-L166)
- Regression spec: [test/nmea-decoder.spec.js](../../../test/nmea-decoder.spec.js) `does not call node.error on decode failure (regression: log flood)`
- CHANGELOG: 0.2.6 "Fixed regressions introduced in 0.2.5"
