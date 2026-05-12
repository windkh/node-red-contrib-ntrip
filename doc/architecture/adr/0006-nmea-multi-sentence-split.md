# ADR-0006: Multi-sentence splitting in the NMEA decoder

## Status

Accepted in 0.2.5.

## Context

A serial GNSS receiver typically emits several NMEA sentences as a batch each
cycle (e.g. `$GPGGA…\r\n$GPRMC…\r\n$GPGSA…\r\n$GPGSV…\r\n`). Likewise, a TCP
producer of NMEA data may pack multiple sentences into one segment.

Pre-0.2.5 the decoder called `NmeaTransport.decode(buffer)` exactly once on
whatever it received. If the input contained more than one sentence, only the
first decoded successfully — the trailing sentences were either lost
(`NmeaTransport` silently took the prefix) or caused the whole call to throw
(if the parser was strict). The README claimed the decoder accepted "either a
single or multiple NMEA messages" — that was untrue.

Two approaches to fix:

1. **Buffer-and-split.** Treat the input as a string, split on `\r\n` (or
   `\n`), trim each piece, decode each non-empty piece.
2. **Push-down to the library.** Ask `@gnss/nmea` to handle multi-sentence
   input. Out of scope — would require upstream changes.

## Decision

Split-and-decode locally. The decoder splits on `/\r?\n/`, trims each chunk,
skips empty ones, and decodes each remaining sentence individually. Each
successful decode produces its own output message — so a batch of four
sentences emits four output messages, not one.

Errors are reported per-sentence. The error output uses the original
`msg.payload` (or `msg.payload.nmeaMessage`) as `input` so a downstream
debugger sees the raw bytes that arrived, not the per-sentence string that
failed (see [Behavioural Design](../behavioural-design.md)).

## Consequences

**Positive**

- Matches the documented behaviour ("accepts single or multiple sentences").
- Downstream wiring is uniform: one decoded sentence = one output message,
  regardless of how the producer chose to chunk.
- Naturally handles trailing/leading whitespace and stray empty lines.

**Negative**

- A chunk that contains both valid and invalid sentences fans out a mix of ok
  and error messages — downstream nodes that assumed "one input ⇒ one output"
  need adjustment.
- Per-sentence trimming adds a small amount of work compared to a single
  parser invocation. For typical NMEA volumes this is negligible.

**Trade-offs**

- Picked **per-sentence semantics** (one in, N out) over **chunk semantics**
  (one in, one out) because the value of getting structured per-sentence
  output far outweighs the slight asymmetry.

## Related

- Code: [ntrip/nodes/nmea-decoder-node.js:50-89](../../../ntrip/nodes/nmea-decoder-node.js#L50-L89)
- Regression spec: [test/nmea-decoder.spec.js](../../../test/nmea-decoder.spec.js) `splits a multi-sentence chunk into separate output messages`
- CHANGELOG: 0.2.5 "Fixed NMEA decoder node — A single chunk containing multiple `\r\n`-delimited NMEA sentences is now decoded sentence by sentence"
