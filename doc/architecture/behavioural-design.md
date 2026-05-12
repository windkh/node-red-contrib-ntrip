# Behavioural Design

## Node-RED node lifecycle

Every node in this package follows Node-RED's standard lifecycle:

```
deploy / restart
      │
      ▼
   constructor(config)              ← create network resources, reset counters
      │
      ▼
   on('input', msg) ──── many ────► (transform / forward / write to socket)
      │
      ▼
   on('close', done)                ← release resources, clear status, done()
```

The constructor receives a `config` object built from the editor form. The
input handler is called for every message flowing into the node. The close
handler runs on flow redeploy or Node-RED shutdown.

## NtripClient — handshake state machine

The `NtripClient` node intercepts the caster's first reply line and uses it to
set its own status. Prior to v0.2.5 this check ran on **every** inbound TCP
packet, which both inflated the message counter and risked dropping RTCM bytes
that shared a TCP segment with the handshake reply. The current design is a
two-state machine:

```
              start
                │
                ▼
          ┌──────────────┐  data: "ICY 200 OK\r\n\r\n..."   ┌─────────────┐
          │ disconnected │ ───────────────────────────────► │  connected  │
          │              │  data: "ICY 406 ..."             │             │
          │              │ ──────► error, stay disconnected │             │
          │              │  data: "SOURCETABLE 200 OK..."   │             │
          │              │ ──────► error, stay disconnected │             │
          │              │  data: anything else             │             │
          │              │ ──────► forward, transition to ─►│             │
          └──────────────┘                                  └──────┬──────┘
                ▲                                                  │
                │              socket close / error                │
                └──────────────────────────────────────────────────┘
```

Key behaviours:

- **Transitional bytes are not lost.** When the handshake reply and the first
  RTCM frame share a TCP segment (common), the node splits at the `\r\n\r\n`
  header terminator and forwards the trailing RTCM bytes on the output.
- **Reset on close.** The `connected` flag is set back to `false` when the
  socket closes, so the next reconnect runs the handshake recognition again.
- **Counters track Rx and Tx separately.** `messagesReceived` is only bumped
  for data forwarded after handshake (not control replies). `messagesSent` is
  bumped per input message written to the caster.

See [ADR-0004](adr/0004-stateful-handshake-interception.md).

## NtripClient — input handling

```
   msg.payload arrives
       │
       ▼
   payload nullish? ─yes─► drop (no-op)
       │ no
       ▼
   Array.isArray(payload)? ─yes─► client.setXYZ(payload)   # update GGA seed
       │ no
       ▼
   client.write(payload)
       │
       ▼
   node.passthrough? ─yes─► node.send(msg)                 # echo on output
       │ no
       ▼
   updateStatus()
```

An `Array` payload is interpreted as a coordinate triple `[x, y, z]` and routed
to the underlying client's `setXYZ` method — used by Sapos and other VRS
casters that gate the stream on a `GGA` from the client. A non-array payload
is written verbatim to the caster.

## NtripClient — outbound write error handling

`net.Socket.write` is asynchronous; runtime failures (ECONNRESET, EPIPE) come
through the socket's `error` event rather than as synchronous throws. The node
therefore has two error paths:

- **Synchronous** — the try/catch around `client.write` catches misuse
  (`client` undefined, wrong-shape payload), reports via `node.error` and
  flashes the status badge red.
- **Asynchronous** — the socket `error` listener calls `node.error` with the
  same wording. `AggregateError` instances (e.g. from happy-eyeballs DNS
  resolution failures) are expanded into one log line per inner error.

## RtcmDecoder — frame reassembly across input events

RTCM 3 frames are variable-length and routinely cross TCP packet boundaries.
The decoder keeps a `pendingBuffer` on the node instance and reassembles:

```
   on('input', msg):
       chunk = msg.payload                            (Buffer or coerced)
       buffer = concat(pendingBuffer, chunk)

       loop while buffer not empty:
           try: [message, length] = RtcmTransport.decode(buffer)
           on throw:
               if buffer.length > 64KB:
                   emit error on output 2
                   buffer = empty
               break   # keep remainder for next input event
           if length not positive or > buffer.length:
               break   # defensive zero-length guard
           emit decoded message on output 1
           buffer = buffer.slice(length)

       pendingBuffer = buffer
       updateStatus()
```

- **Partial-frame tolerance.** A throw is interpreted as "frame may be incomplete";
  bytes stay in `pendingBuffer` to be re-tried with the next chunk.
- **Garbage cap.** If `pendingBuffer` grows past 64 KB without ever decoding a
  frame, the data is flushed to the error output and the buffer is cleared —
  prevents runaway memory if the upstream feeds non-RTCM bytes indefinitely.
- **Forward-progress guarantee.** A non-positive or oversized `length` from the
  decoder breaks the loop rather than spinning.

See [ADR-0005](adr/0005-rtcm-partial-frame-buffer.md).

## NmeaDecoder — multi-sentence splitting

A single input chunk may carry several `\r\n`-delimited sentences. The decoder
splits and decodes each independently:

```
   on('input', msg):
       rawInput = msg.payload.nmeaMessage ?? msg.payload   (preserved untouched)
       rawString = Buffer? rawInput.toString('utf8') : rawInput

       for each sentence in rawString.split(/\r?\n/):
           sentence = sentence.trim()
           skip if empty
           try: NmeaTransport.decode(sentence) → emit on output 1
           on throw: emit on output 2 with
                input:       rawInput   (Buffer if Buffer was supplied)
                inputString: rawString  (utf8 form)
```

- **`input` preservation.** The original payload (`Buffer` if a `Buffer` was
  supplied) is carried through to the error output unchanged — restored in
  v0.2.6 after a regression in v0.2.5 forced everything through `toString`
  before storing.

See [ADR-0006](adr/0006-nmea-multi-sentence-split.md).

## NmeaEncoder — instance passthrough vs construction

The encoder accepts two input shapes:

- A pre-constructed `NmeaMessage*` instance — passed straight to
  `NmeaTransport.encode` without inspection.
- A plain field object plus a `messageType` discriminator — fed through a
  `switch (messageType)` that maps to the right `NmeaMessage*.construct(input)`
  factory.

```
   on('input', msg):
       require payload, payload.nmeaMessage, payload.messageType  (else error output)

       try:
           messageType = String(payload.messageType).toUpperCase()
           input = payload.nmeaMessage

           if input instanceof NmeaMessage:
               nmeaMessage = input
           else:
               nmeaMessage = NmeaMessage<Type>.construct(input)
               unknown messageType → throw (caught and routed to error)

           message = NmeaTransport.encode(nmeaMessage)
           emit on output 1

       on throw: emit on output 2 (no node.error)
```

## Two-output error routing

Every decoder/encoder uses the `[ok, error]` two-output convention rather than
calling `node.error()` for per-message failures. The reason is that high-rate
streams routinely emit mismatched binary (the README explicitly suggests
wiring an NMEA decoder onto an RTK2Go stream as a demonstration) — calling
`node.error` for each failure floods the Node-RED `[error]` log. The error
output is the channel; wire it to a debug or downstream handler.

See [ADR-0003](adr/0003-two-output-decoder-design.md).

## Status badge convention

All four nodes follow the same rule for the badge under the node in the
Node-RED editor:

| State | Fill | Shape | Text |
|-------|------|-------|------|
| starting | yellow | ring | `connecting...` (NtripClient only) |
| running | green | ring | counters, e.g. `Rx 123 Tx 4` / `NMEA: 12 Invalid: 0` |
| connected (NtripClient) | green | ring | `NTRIP server connected.` |
| handshake error | red | ring | `NTRIP server rejected connection.` or `No mountpoint <name>` |
| write/decode error | red | ring | error message |
| closed | (cleared) | — | — |

## Close behaviour

| Node | On `close` |
|------|------------|
| NtripClient | `client.removeAllListeners()`, then `client.close()`, clear status. |
| RtcmDecoder | Discard `pendingBuffer`, clear status. |
| NmeaDecoder | Clear status. |
| NmeaEncoder | Clear status. |
