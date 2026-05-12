# Statistics

Snapshot taken at **v0.2.6** (commit `ecf02ba`).

## Lines of code

### Source

| File | LOC |
|------|----:|
| [ntrip/99-ntrip.html](../../ntrip/99-ntrip.html) | 467 |
| [ntrip/nodes/ntrip-client-node.js](../../ntrip/nodes/ntrip-client-node.js) | 182 |
| [ntrip/nodes/nmea-encoder-node.js](../../ntrip/nodes/nmea-encoder-node.js) | 177 |
| [ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js) | 114 |
| [ntrip/nodes/nmea-decoder-node.js](../../ntrip/nodes/nmea-decoder-node.js) | 98 |
| [ntrip/nodes/rtcm-decoder-node.js](../../ntrip/nodes/rtcm-decoder-node.js) | 91 |
| [ntrip/99-ntrip.js](../../ntrip/99-ntrip.js) | 26 |
| **Total** | **1155** |

- JavaScript-only source: **688 LOC** across 6 files.
- HTML editor UI: **467 LOC** in one file.

### Tests

| File | LOC | Tests |
|------|----:|------:|
| [test/nmea-decoder.spec.js](../../test/nmea-decoder.spec.js) | 134 | 6 |
| [test/rtcm-decoder.spec.js](../../test/rtcm-decoder.spec.js) | 108 | 4 |
| [test/nmea-encoder.spec.js](../../test/nmea-encoder.spec.js) | 96 | 4 |
| **Total** | **338** | **14** |

### Ratios

| Metric | Value |
|--------|------:|
| Test LOC / JS source LOC | 49 % |
| Tests per JS source file (4 of 6 covered by specs) | 3.5 avg |
| Comments + blank lines (rough estimate) | ~20 % of source |

## Test suite

Run with `npm test`. Latest local run: **14 passing, 0 failing, ~500 ms**.

Breakdown:

- **NmeaDecoder** (6 specs) — golden GGA decode, multi-sentence split, Buffer
  input, `payload.nmeaMessage` shape, Buffer preservation in error output, no
  `node.error` flood (regression).
- **NmeaEncoder** (4 specs) — `NmeaMessage` instance passthrough, unknown
  `messageType` routed to error output, missing fields routed to error output,
  empty payload handled.
- **RtcmDecoder** (4 specs) — golden RTCM 1005 decode, two concatenated frames
  fan out, frame split across two input events reassembled, no `node.error`
  flood under garbage (regression).

3 of the 14 specs are explicitly tagged `(regression: …)` and lock in
previously-shipped bug fixes. Run them in isolation with
`npx mocha test/**/*.spec.js -g regression`.

NtripClient is *not* covered by the suite — it requires a fake TCP server.
See [Future Improvements](future-improvements.md).

## Coverage

**Not measured.** No `c8` / `nyc` / Istanbul integration is configured. To
enable, add `c8` as a dev dep and a `coverage` script (`c8 --reporter=text
--reporter=html mocha test/**/*.spec.js`). Statement coverage of the three
spec'd nodes should be ≥ 85 % at the current spec count; the missing 15 % is
mostly edge-case branches inside `RtcmTransport.decode` failures.

## Repository history

Snapshot from `git log`:

| Metric | Value |
|--------|------:|
| Total commits on `main` | 28 |
| Commits matching `/fix/i` | 8 |
| Releases tagged in [CHANGELOG.md](../../CHANGELOG.md) | 9 (0.1.0 → 0.2.6) |
| Bug-fix-only releases (0.2.4 / 0.2.5 / 0.2.6) | 3 (last 14 days) |

## Dependencies

| Class | Count | Names |
|-------|------:|-------|
| Runtime | 3 | `@gnss/nmea`, `@gnss/rtcm`, `ntrip-client` |
| Dev | 4 | `mocha`, `chai`, `node-red`, `node-red-node-test-helper` |
| Transitive (dev tree) | ~600 | from `npm audit` |

After installing dev deps: `6 vulnerabilities (1 low, 2 moderate, 3 high)` —
all inside the `node-red` dev tree, none reachable from the published package
because the runtime dep set is just three packages.

## Quality Index

A composite, intentionally rough — a way to track movement over time, not an
absolute scale. Each criterion is scored 0–10; the index is the unweighted
mean.

| Criterion | Score | Reasoning |
|-----------|------:|-----------|
| Test coverage (proxy: spec count vs node count) | 7 | 14 specs over 3 of 4 nodes. `NtripClient` untested. |
| Bug-fix cadence (lower is better, scored inversely) | 5 | 3 patch releases in 2 weeks indicates churn from recent rewrite — settling now. |
| Documentation completeness | 8 | Per-node help text, README usage notes, this architecture doc. |
| Type safety | 2 | No TypeScript or JSDoc-with-`@ts-check`. |
| Lint / style enforcement | 1 | No `eslint` or `prettier`. Style is consistent by convention only. |
| Dependency hygiene | 7 | 3 runtime deps, 0 known runtime vulns. Dev tree carries `node-red` itself. |
| CI rigour | 6 | Builds + tests on three Node versions. No coverage gate, no lint gate. |
| Bus factor | 4 | Single primary maintainer (`Karl-Heinz Wind`). 1 active contributor. |
| **Overall** | **5.0** | Median: 5.5. Headroom in lint, types, and `NtripClient` coverage. |

### How to improve the index quickly

- **+1.0 each** — adopting `eslint` (covers Type safety bump via `@ts-check`
  on JSDoc) and adding coverage reporting.
- **+0.5** — writing one round of `NtripClient` integration specs against a
  fake caster.
- **+0.5** — pinning dev deps in `package.json` more strictly (`~` instead of `^`).
