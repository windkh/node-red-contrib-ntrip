# Future Improvements

These are *new capability* items rather than refactors. They would change
behaviour visible to the user, and most warrant a minor version bump
(0.3.0+) or a major one if they break the public message shape.

## Protocol / network

### NTRIPS (NTRIP over TLS)

NTRIP V2 may run over TLS (typically port 2102, sometimes 443). The package
currently relies on plaintext TCP via `net.createConnection`. Adding TLS
would need:

- A toggle in the editor form (`useTls: boolean`).
- A separate `tls.connect` path in [ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js).
- Optional CA bundle / SNI / certificate-pinning settings.
- Documentation that NTRIPS handshake is identical to NTRIP V2 once the TLS
  tunnel is established.

Breaks no existing flow — pure additive.

### Connection-state event output

Today, downstream Node-RED flows cannot react to `NtripClient` reconnects,
rejections, or handshake completion except by scraping the status badge
text — a workaround the existing `examples/watchdog.json` flow (v0.2.10)
demonstrates: use a `trigger` node to detect data stalls, plus a small
state-tracker function to emit `STALLED` / `RECOVERED` transitions.

Three implementation options for first-class events, in order of disruption:

1. Emit a tagged message on the existing output:
   `{ payload: null, state: 'connected' | 'rejected' | 'reconnecting' }`.
   Slightly viral — every downstream node must filter `payload != null`.
2. Add a second output port for state events. Breaks layout of existing
   flows.
3. Surface state via Node-RED's runtime event bus (`RED.events.emit`).
   Non-breaking but requires opt-in from consumers.

### NTRIP source-table fetch / mountpoint picker

The branch `prepared getMountpoints: postponed…` (commit `38a243b`)
indicates a prior attempt at fetching a caster's source table to populate a
dropdown in the editor. The hold-up was that credentials are stored
server-side and the editor JS can't access them. A workable approach: add
a small admin endpoint (`RED.httpAdmin.get('/ntrip/sourcetable')`) that
performs the fetch on the server using the stored credentials.

## Test / quality

### NtripClient integration tests

Use `net.createServer` to stand up a fake caster that the test harness
fully controls. Worth-testing scenarios:

- Each `authmode` writes the correct handshake string.
- `ICY 200 OK\r\n\r\n<rtcm>` reply: trailing bytes are forwarded.
- `ICY 406`: error logged, status red, no data forwarded.
- Mid-stream socket close: `connected` resets so the next handshake reply
  re-enters the state machine.
- Reconnect backoff schedule (`1s / 2s / 5s / 10s`) advances on failure
  and resets on successful `ICY 200 OK`.
- `msg.payload = [x, y, z]` routes to `setXYZ` (verify via the upstream
  client's internal GGA emission).
- CR/LF in credentials: rejected at construct, no socket opened.

The `test-helpers/fake-red.js` shim added in 0.2.11 by
node-red-standards is a starting point that avoids pulling in the full
Node-RED runtime.

### Coverage gate in CI

`c8` is wired in (`npm run coverage`, `npm run coverage:check`) but no
threshold is set. Suggest a 70 % statement coverage floor as a soft target
— high enough to be useful, low enough not to require gymnastics on the
rare error paths — enforced by adding a `c8` config to `package.json` and
letting `coverage:check` fail CI when the floor is missed.

### TypeScript types (`.d.ts`)

The five nodes have a public message-shape contract (the `payload` schemas
documented in the help text). Publishing JSDoc-derived `.d.ts` files would
let TypeScript users in Node-RED's `function` nodes get autocomplete for
`msg.payload.messageType`, `msg.payload.message.staX`, etc. Lightweight to
add via `// @ts-check` and JSDoc on the existing JS source.

## Editor UX

### Per-node info-sidebar fixtures

Add small example payloads to the help text so users can copy them
straight into an `inject` node:

```javascript
// Example NmeaEncoder input
msg.payload = { messageType: 'GGA', nmeaMessage: { /* fields */ } };
```

The HTML stubs added in 0.2.6 are documentation but no example flows are
linked from the editor — only from the README. A `<a href="…/examples/…">`
link inside each help block would close that gap.

### Hide credentials when not needed

When `mode === 'download'` and the caster doesn't require auth, the
Username/Password fields are still shown. A small `oneditprepare` hide
rule keyed on a "Requires authentication" checkbox would declutter the
dialog.

## Codec coverage

### More NMEA sentence types

The current encoder supports 17 sentence types. The `@gnss/nmea` library
has more (e.g. `VBW`, `VDR`, `WCV`, …). Adding a case is one import + one
`switch` arm; the test suite already covers the through-path, so each new
type is ~5 LOC.

### RTCM message-type filter

A `messageTypeFilter: number[]` config (e.g. `[1005, 1077, 1087]`) on the
decoder would let users drop frame types they don't care about *before*
they reach downstream nodes. Reduces flow noise and downstream work.

### RTCM construction from plain field objects

The `RtcmEncoder` currently requires an `RtcmMessage` instance
([ADR-0011](adr/) — actually documented inline in behavioural-design.md
under "RtcmEncoder — instance-only encoding"). A future encoder could
optionally accept plain field objects for the ~10 most common message
types (1005/1006/1074/1084/1094/1124/…), constructed via
`RtcmMessage*.construct(fields)`.

## Distribution / packaging

### Publish `node-red-standards` to npm

`node-red-standards` is pinned as a codeload tarball URL by commit SHA
(see [ADR-0010](adr/0010-node-red-standards-adoption.md)). This works but
means Dependabot cannot auto-bump the SHA. Publishing the standards repo
to npm would restore normal semver + Dependabot flow.

### Fix the `mmea` typo in `package.json` keywords

[package.json](../../package.json) `keywords` includes `"mmea"` — should
be `"nmea"`. Catalogue search misses are real downloads lost.
