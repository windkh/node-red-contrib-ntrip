# Overview

## What this package is

`node-red-contrib-ntrip` is a Node-RED contribution package that adds four
GNSS-related nodes to a Node-RED palette. The package is distributed via npm
and consumed by users through Node-RED's "Manage palette" UI — there is no
standalone application binary.

The four nodes:

| Node | Direction | Library | Purpose |
|------|-----------|---------|---------|
| `NtripClient` | network ↔ flow | [`ntrip-client`](https://github.com/dxhbiz/ntrip-client) (extended) | Connect to an NTRIP caster as either a *client* (download corrections) or a *server* (upload corrections to a mountpoint). |
| `RtcmDecoder` | binary → object | [`@gnss/rtcm`](https://github.com/node-ntrip/rtcm) | Decode RTCM 3 binary frames into JavaScript objects. |
| `NmeaDecoder` | text → object | [`@gnss/nmea`](https://github.com/node-ntrip/nmea) | Decode NMEA 0183 ASCII sentences into JavaScript objects. |
| `NmeaEncoder` | object → text | [`@gnss/nmea`](https://github.com/node-ntrip/nmea) | The inverse — emit a NMEA sentence string from an object. |

## Who uses it

Practitioners building RTK/PPP/DGNSS pipelines in Node-RED — typically:

- Receiving correction streams from a public NTRIP caster (RTK2Go, SAPOS,
  Centipede, Onocoy) and forwarding them to a rover (e.g. an ESP32-XBee, an
  RTKLib instance, a u-blox receiver) over TCP, Serial, MQTT.
- Operating a private base station (e.g. RTKBase) and pushing corrections to a
  caster for others to consume.
- Logging or inspecting GNSS messages live for monitoring or debugging.

## How the nodes fit together

A typical flow looks like:

```
                                   ┌────────────────┐
                                   │  RTCM Decoder  │──► (per-frame objects, output 1)
                                   │                │──► (decode errors,    output 2)
   ┌────────────────┐  RTCM bytes  └────────────────┘
   │  NTRIP Client  │──────────────►
   │   (download)   │              ┌────────────────┐
   └────────────────┘              │  NMEA Decoder  │──► (per-sentence objects, output 1)
                                   │                │──► (decode errors,        output 2)
                                   └────────────────┘
```

```
   ┌─────────────────┐   RTCM bytes  ┌────────────────┐
   │  TCP In / RTK   │──────────────►│  NTRIP Client  │──► (caster replies, optional pass-through)
   │  Base / etc.    │               │   (upload)     │
   └─────────────────┘               └────────────────┘
```

For VRS / network-RTK casters that require a position fix from the client:

```
   ┌─────────────┐ msg.payload=[x,y,z] ┌────────────────┐
   │ Position    │────────────────────►│  NTRIP Client  │──(internal: synthesise NMEA GGA periodically)──► caster
   │ source      │                     │   (download)   │
   └─────────────┘                     └────────────────┘
```

## Runtime model

- **Pure JavaScript, no build step.** Files in [ntrip/](../../ntrip/) are loaded by Node-RED at startup.
- **Single registration entry point** — [ntrip/99-ntrip.js](../../ntrip/99-ntrip.js) `require`s the four node implementations and calls `RED.nodes.registerType` for each. See [ADR-0001](adr/0001-single-registration-file.md).
- **Editor HTML co-located** — all four node configuration dialogs and help text live in [ntrip/99-ntrip.html](../../ntrip/99-ntrip.html).
- **Node ≥ 18** — runtime requires `AggregateError` and modern syntax.
- **Stateless across restarts** — node configuration is persisted by Node-RED's flow file; the nodes themselves carry only in-memory state (counters, the NTRIP socket, the RTCM pending buffer).

## Reading order for new contributors

1. This file.
2. [Structural Design](structural-design.md) — how files and modules relate.
3. [Behavioural Design](behavioural-design.md) — runtime flow, state machines, error paths.
4. [Architecture Decisions](architecture-decisions.md) — links to each ADR.
5. [Errors and Weaknesses](errors-and-weaknesses.md) — current known limitations.
6. [Statistics](statistics.md) — LOC, test count, and a simple quality index.
