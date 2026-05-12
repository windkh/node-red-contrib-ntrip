# ADR-0008: `(0, 0, 0)` as the "no location" sentinel for GGA emission

## Status

Accepted in 0.2.5.

## Context

Many NTRIP casters require a position fix from the client before they will
stream corrections — they need to know which network-RTK base station to
deliver corrections from. The standard way to convey the fix is a periodic
NMEA `GGA` sentence from the client to the caster. The upstream `ntrip-client`
package's `xyz` option turns on this behaviour: if `xyz` is set, a `GGA` is
synthesised from those coordinates and sent every `interval` ms.

In the editor form the user supplies three numeric fields (X / Y / Z) plus an
interval. There needs to be a way to say "I have no location, do not send
GGA" — for casters that *don't* require GGA, sending a synthetic one is
unnecessary noise.

Two options:

1. **A dedicated checkbox / radio** (`Send periodic GGA: yes/no`).
2. **A sentinel value** — treat `(0, 0, 0)` as "no location".

Pre-0.2.5 the code used `x && y && z` as the gate, which had the wrong
semantics — *any* zero component (e.g. someone on the equator with X≈6378km,
Y=0, Z=0) disabled the GGA.

## Decision

Use `(0, 0, 0)` as the sentinel. The check is:

```javascript
if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
    && !(x === 0 && y === 0 && z === 0)) {
    options.xyz = [x, y, z];
}
```

- All three must be finite — `NaN` (the result of `parseFloat('')` on an
  empty form) does not enable GGA.
- The all-zero triple is the only excluded value.
- Coordinates with one or two zero components are fine — they fall through to
  the caster.

## Consequences

**Positive**

- One-field-fewer in the editor form.
- Equator / axis-aligned positions work correctly.
- Matches the convention used by other NTRIP tooling (rtklib, str2str): if
  you don't want GGA, you set the coordinates to all zeros.

**Negative**

- Discoverability — a user looking at the form has no in-UI hint that
  `(0, 0, 0)` is special. The README and the editor help text document this,
  but a fresh user might not read either.
- The Earth's center of mass at `(0, 0, 0)` ECEF is technically a *real*
  position. Not a meaningful place for a GNSS receiver to be, but the sentinel
  collides with one mathematically valid input.

**Trade-offs**

- Picked **minimum form surface** over **explicit toggle**. If user feedback
  reports confusion, swap to an explicit checkbox in a future minor release
  and keep the sentinel for backward compatibility.

## Related

- Code: [ntrip/nodes/ntrip-client-node.js:43-46](../../../ntrip/nodes/ntrip-client-node.js#L43-L46)
- Editor help text: [ntrip/99-ntrip.html](../../../ntrip/99-ntrip.html) "Optional ECEF coordinate triple" block
- README: "Notes on usage — NTRIP Client: coordinates"
- CHANGELOG: 0.2.5 "Coordinate guard changed from `x && y && z` to `not all zero`"
