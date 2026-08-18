# Statistics

Snapshot taken at **v0.2.11**.

## Lines of code

### Source

| File | LOC |
|------|----:|
| [ntrip/99-ntrip.html](../../ntrip/99-ntrip.html) | 552 |
| [ntrip/nodes/ntrip-client-node.js](../../ntrip/nodes/ntrip-client-node.js) | 206 |
| [ntrip/nodes/nmea-encoder-node.js](../../ntrip/nodes/nmea-encoder-node.js) | 172 |
| [ntrip/lib/ntrip-client.js](../../ntrip/lib/ntrip-client.js) | 144 |
| [ntrip/nodes/nmea-decoder-node.js](../../ntrip/nodes/nmea-decoder-node.js) | 103 |
| [ntrip/nodes/rtcm-decoder-node.js](../../ntrip/nodes/rtcm-decoder-node.js) | 92 |
| [ntrip/nodes/rtcm-encoder-node.js](../../ntrip/nodes/rtcm-encoder-node.js) | 91 |
| [ntrip/99-ntrip.js](../../ntrip/99-ntrip.js) | 30 |
| **Total** | **1390** |

- JavaScript-only source: **838 LOC** across 7 files (was 688 in 5 files at v0.2.7).
- HTML editor UI: **552 LOC** in one file (was 467 — grew with the `RtcmEncoder` help block).

### Tests

| File | LOC | Tests |
|------|----:|------:|
| [test/nmea-decoder.test.js](../../test/nmea-decoder.test.js) | 147 | 6 |
| [test/rtcm-encoder.test.js](../../test/rtcm-encoder.test.js) | 145 | 6 |
| [test/rtcm-decoder.test.js](../../test/rtcm-decoder.test.js) | 117 | 4 |
| [test/nmea-encoder.test.js](../../test/nmea-encoder.test.js) | 105 | 4 |
| **Total** | **514** | **20** |

Migration to `node:test` + `node:assert` (v0.2.11) trimmed each spec slightly
from its Mocha original, while `RtcmEncoder` added a whole new file.

### Ratios

| Metric | Value |
|--------|------:|
| Test LOC / JS source LOC | 61 % |
| Tests per JS source file (4 of 7 covered) | 5 avg |

## Test suite

Run with `npm test`. Latest local run: **20 passing, 0 failing, ~5 s**.

Breakdown by node:

- **NmeaDecoder** (6 specs) — golden GGA decode, multi-sentence split, Buffer
  input, `payload.nmeaMessage` shape, Buffer preservation in error output, no
  `node.error` flood (regression).
- **NmeaEncoder** (4 specs) — `NmeaMessage` instance passthrough, unknown
  `messageType` routed to error output, missing fields routed to error output,
  empty payload handled.
- **RtcmDecoder** (4 specs) — golden RTCM 1005 decode, two concatenated frames
  fan out, frame split across two input events reassembled, no `node.error`
  flood under garbage (regression).
- **RtcmEncoder** (6 specs) — round-trip from decoder instance,
  decoder-output-shape input, non-`RtcmMessage` payload rejected to error
  output, empty payload rejected, no `node.error` flood on bad input,
  test-fixture sanity.

Regression specs (`(regression: …)` in the test name) lock in
previously-shipped bug fixes. Run them in isolation with
`node --test --test-name-pattern regression`.

`NtripClient` is *not* covered by the suite — it requires a fake TCP server.
The `test-helpers/fake-red.js` shim added in v0.2.11 lays some groundwork;
see [Future Improvements](future-improvements.md).

## Coverage

**Not measured in CI.** `c8` is wired in (`npm run coverage`), but no
threshold gate is set. Statement coverage of the four spec'd nodes should be
≥ 85 % at the current spec count; the missing 15 % is mostly edge-case
branches inside `RtcmTransport.decode` failures.

## Repository history

Snapshot from `git log` at v0.2.11:

| Metric | Value |
|--------|------:|
| Total commits on `main` | 73 |
| Commits matching `/fix/i` | 11 |
| Releases tagged in [CHANGELOG.md](../../CHANGELOG.md) | 15 (0.1.0 → 0.2.11) |
| npm-published tags | 5 (0.2.7 / 0.2.8 / 0.2.9 / 0.2.10 / 0.2.11) |

## Dependencies

| Class | Count | Names |
|-------|------:|-------|
| Runtime | 3 | `@gnss/nmea`, `@gnss/rtcm`, `ntrip-client` |
| Dev | 9 | `@eslint/js`, `c8`, `eslint`, `eslint-config-prettier`, `globals`, `node-red`, `node-red-node-test-helper`, `node-red-standards` (pinned tarball), `prettier` |

`npm audit --omit=dev`: **0 vulnerabilities** in the runtime tree.
Dev tree carries the usual `node-red` transitive advisories that Dependabot
can't always resolve (see the ignore list in `.github/dependabot.yml`).

## Quality Index

A composite, intentionally rough — a way to track movement over time. Each
criterion scored 0–10; the index is the unweighted mean.

| Criterion | v0.2.7 | v0.2.11 | Change |
|-----------|-------:|--------:|-------:|
| Test coverage (proxy: spec count vs node count) | 7 | 8 | +1 — `RtcmEncoder` now covered too |
| Bug-fix cadence (lower is better) | 5 | 7 | +2 — internal churn settled |
| Documentation completeness | 8 | 8 | — |
| Type safety | 2 | 2 | — |
| Lint / style enforcement | 1 | 8 | **+7** — ESLint flat + Prettier + single-exit style in AGENTS.md |
| Dependency hygiene | 7 | 7 | — |
| CI rigour | 6 | 8 | +2 — lint + format:check + tests + `nrstd audit` all on 20/22 |
| Bus factor | 4 | 4 | — |
| **Overall** | **5.0** | **6.5** | **+1.5** |

### How to improve the index further

- **+1.0** — add `NtripClient` integration specs against a fake TCP server
  (would bump both Test coverage and CI rigour).
- **+0.5** — publish a `coverage:check` threshold (e.g. 80 % statements) as a
  CI gate.
- **+0.5** — add `@ts-check` + JSDoc types (bumps Type safety without a full
  TypeScript migration).
