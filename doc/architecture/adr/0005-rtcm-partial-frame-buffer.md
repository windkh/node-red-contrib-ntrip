# ADR-0005: Carry-over buffer for partial RTCM frames

## Status

Accepted in 0.2.5.

## Context

RTCM 3 frames are variable-length and routinely cross TCP packet boundaries.
A typical RTCM 1077 (MSM7 GPS) frame is ~200 bytes; an MTU is ~1460 bytes
payload — perfectly possible for a frame to span two TCP segments, and very
common when many frames are sent back-to-back.

The upstream `@gnss/rtcm` library's `RtcmTransport.decode(buffer)`:

- Returns `[message, length]` if `buffer` starts with a complete frame.
- Throws if the buffer starts with what looks like an RTCM frame but ends
  before the frame does.

Up to 0.2.4 the decoder consumed one chunk at a time without any
buffer-carry-over: every throw inside the chunk caused the loop to break and
any trailing bytes were discarded. With ~5 frames per packet boundary and
~100 frames/s, this lost ~5 % of frames on a busy stream.

## Decision

Carry partial-frame bytes across input events:

```javascript
node.pendingBuffer = Buffer.alloc(0);

on('input', msg) {
    let buffer = pendingBuffer.length > 0
        ? Buffer.concat([pendingBuffer, msg.payload])
        : msg.payload;

    while (buffer.length > 0) {
        try {
            [message, length] = RtcmTransport.decode(buffer);
        } catch (ex) {
            // Likely partial frame — keep buffer for next chunk.
            if (buffer.length > 64KB) {
                // Garbage cap — emit error and clear.
                emit_error(); buffer = empty;
            }
            break;
        }
        if (length <= 0 || length > buffer.length) break;   // forward-progress guard
        emit_decoded(); buffer = buffer.slice(length);
    }
    pendingBuffer = buffer;
}
```

The 64 KB cap stops the buffer growing unboundedly when the upstream feeds
non-RTCM bytes. The forward-progress guard stops a hypothetical infinite loop
on a zero-length decode.

## Consequences

**Positive**

- Frames that straddle TCP boundaries are decoded correctly — no frame loss
  in normal operation.
- The cap means a misconfigured flow (e.g. RTCM decoder fed NMEA) eventually
  produces an error rather than running out of memory.
- The forward-progress guard makes the loop terminate under any decoder
  behaviour.

**Negative**

- The node now holds a per-instance buffer up to 64 KB. For 100 instances in
  one flow that's 6.4 MB worst-case — not significant, but worth noting.
- Decode latency at the chunk boundary is slightly higher: the decoder has to
  retry as more bytes arrive. In practice this is one extra round of
  `decode()` per chunk.

**Trade-offs**

- Chose **correctness on stream boundaries** over **per-call statelessness**.
  A stateless decoder would be easier to reason about, but would lose frames.

## Related

- Code: [ntrip/nodes/rtcm-decoder-node.js:14-78](../../../ntrip/nodes/rtcm-decoder-node.js#L14-L78)
- Regression spec: [test/rtcm-decoder.spec.js](../../../test/rtcm-decoder.spec.js) `reassembles a frame split across two input events (carry-over buffer)`
- CHANGELOG: 0.2.5 "Fixed RTCM decoder node — Frames that straddle TCP packet boundaries are now buffered"
