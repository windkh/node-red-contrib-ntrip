# Refactoring Recommendations

Items below are *recommendations*, not blockers. They are ordered by leverage —
the changes near the top would simplify the code or unlock further improvements;
the ones near the bottom are nice-to-have polish.

## 1. Split `NtripClient` node into mode-specific handlers

[ntrip/nodes/ntrip-client-node.js](../../ntrip/nodes/ntrip-client-node.js) is the
biggest file in the package (~180 LOC) and mixes:

- Configuration parsing and validation
- Coordinate gating
- Download vs upload branching
- Handshake state machine
- Status badge updates
- Input dispatch (Array → `setXYZ` vs Buffer → `write`)
- Error coercion (AggregateError vs plain Error)
- Close cleanup

Suggested decomposition:

```
ntrip-client-node.js          (90 LOC — wiring, lifecycle, status)
  ├── parse-config.js         (50 LOC — host/port/coords validation, returns options)
  ├── handshake-state.js      (40 LOC — the `connected` machine + buffer-tail splitter)
  └── input-router.js         (30 LOC — Array→setXYZ vs Buffer→write)
```

This unlocks per-piece unit tests (you can test `handshake-state.js` without a
socket) and makes future protocol additions (e.g. NTRIP V2 keep-alive
heartbeat) localisable.

## 2. Pull the handshake protocol bytes into a constants module

The four authentication-mode handshake strings live as template literals
inside [ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js) `_connect`.
Moving them to a `lib/handshake-protocols.js` table makes them:

- testable without standing up a TCP server
- comparable side-by-side
- replaceable per-protocol when a caster requires a quirk header

```javascript
// lib/handshake-protocols.js
module.exports = {
    legacy:   ({mp, user, pw}) => user || pw
        ? `SOURCE ${pw} /${mp}\r\nSource-Agent: NTRIP ${user}\r\n\r\n`
        : `SOURCE ${mp}\r\n\r\n`,
    hybrid:   ({mp, auth}) => `SOURCE ${mp}\r\nAuthorization: Basic ${auth}\r\n\r\n`,
    ntripv1:  ({mp, ua, auth}) => `POST /${mp} HTTP/1.0\r\n...`,
    ntripv2:  ({mp, host, port, ua, auth}) => `POST /${mp} HTTP/1.1\r\nHost: ${host}:${port}\r\n...`,
};
```

## 3. Delegate `_connect` instead of replacing it

Today `NtripClientUploader._connect()` is a full re-implementation of the
upstream `NtripClient._connect()` — copy-paste of timeout/connect/data/end/
close/error wiring with only the on-connect handshake string differing. Any
fix to the upstream socket lifecycle won't reach the uploader.

A delegation refactor: override only `_buildHandshake()` (a new hook) and call
`super._connect()`. Requires either upstream cooperation or carefully scoping a
local fork. See [ADR-0002](adr/0002-ntrip-uploader-extension.md).

## 4. Generate the editor HTML from a schema

[ntrip/99-ntrip.html](../../ntrip/99-ntrip.html) is ~470 lines, most of which
is repeated `<dl class="message-properties">` markup for help text. A small
build step (`prebuild` npm script + JS that reads a JSON/JS schema) would
shrink the source and eliminate drift between code and help text. Trade-off:
introduces a build step the package currently doesn't have.

## 5. Stop attaching the raw `input` Buffer to every emitted message

Decoders today emit `payload.input = <slice of the consumed buffer>` on
success. For high-rate RTCM streams (~100 frames/s) this means each downstream
node holds a reference to that buffer until it discards the message — extra GC
pressure for no functional reason. An emit-on-error-only policy would halve
memory churn.

Caveat: callers may be using `input` for round-trip or replay tooling — would
need a deprecation cycle.

## 6. Pull the `updateStatus` helper into a shared mixin

All four node files have a near-identical `updateStatus()` function. Extracting
it to `lib/node-helpers.js` saves ~12 LOC × 4 files and provides one place to
adjust the badge format. Marginal savings, but it also unlocks a single place
to gate badge updates (e.g. throttle to 1 Hz for noisy streams).

## 7. Validate the editor form on save, not on connect

Currently the editor `validate:` callbacks only run for `host`/`mountpoint`/
`port` (and were missing on `host`/`mountpoint` before 0.2.5). Stricter
front-end validation (CR/LF rejection, mountpoint character class) avoids the
"saved fine, fails at runtime" failure mode and surfaces errors in the editor
ribbon.

## 8. Replace `node.passthrough = config.passthrough || false` with a tagged
   pass-through message

When upload-mode pass-through is enabled, written bytes are re-emitted on the
same output as caster replies, with no tag distinguishing them. A
`msg._upload_echo = true` flag (or a second output port — breaking change) lets
downstream nodes tell the streams apart without sniffing the payload.

## 9. Extract common Mocha test helpers

The three spec files share boilerplate (`helper.startServer` / `helper.unload`,
flow factory, `helper.load(..., () => ... )` promise wrapping). A
`test/helpers/load-node.js` that returns `{n1, ok, err, done}` would cut the
spec files by ~30%.
