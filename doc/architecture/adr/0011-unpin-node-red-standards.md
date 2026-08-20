# ADR-0011: Unpin `node-red-standards`, audit against the floating reference

## Status

Accepted in 0.2.13. Supersedes item 5 of
[ADR-0010](0010-node-red-standards-adoption.md).

## Context

ADR-0010 pinned `node-red-standards` as a codeload tarball at a specific
commit SHA. The stated reasoning was:

- **Reproducibility.** Every `npm ci` gets the same standards binary.
- **No EINTEGRITY.** Any commit on the standards' `main` invalidated the
  lockfile's integrity hash, which was flooding CI with red runs.
- **Local + CI parity.** `nrstd sync` locally used the same version CI
  audited against.

Between 0.2.11 and 0.2.12 the standards repo shipped **three releases**
(0.3.1 through 0.5.0) that added eight new checks:
`.gitattributes`, `c8 block`, `Coverage floor declared`, `Unpinned
reference to the standard`, `CHANGELOG.md`, and one workflow-existence
check for each of the three CI files. This repo satisfied **none** of
them. But `standards-check.yml` kept reporting `10/10` because it was
running the frozen 0.3.0 audit code against the frozen 0.3.0 rule set —
which of course passed.

A drift detector that runs a frozen rule set does not detect drift. It
just reassures.

Two failure modes it also masked:

- The missing `c8` config. `c8 --check-coverage` with no block falls back
  to c8's defaults (90 % lines, 0 % everything else). This repo measures
  56.6 %. The moment a newer `node.js.yml` arrived with a
  `coverage:check` step, CI would go red on a floor nobody chose.
- Two stale workflow files (`node.js.yml`, `standards-check.yml`) that
  never received updates from the standard.

`node-red-standards` 0.5.0 turned this into a check of its own:
`Unpinned reference to the standard` reports drift on any Git-URL-form
reference to itself in `package.json`.

## Decision

Reverse item 5 of ADR-0010:

1. Drop the pinned codeload tarball from `devDependencies`.
2. Restore `standards-check.yml` to the template form:
   `npx --yes github:windkh/node-red-standards audit`. Every job resolves
   the current `main` of the standards repo, so today's audit runs
   today's rules.
3. Add an explicit `c8` configuration block with thresholds set at the
   measured floor (`lines 56, statements 56, branches 71, functions 64`).
   Emit `lcov` alongside `text` so the workflow artifact contains
   something readable.
4. Adopt the current `node.js.yml` — adds the `coverage:check` step and
   the coverage-artifact upload; drops the leftover `npm run build
   --if-present`.

The EINTEGRITY problem that motivated pinning is no longer a live concern
because `standards-check.yml` no longer installs the standard as a
devDependency — it just `npx`s it directly, which uses npm's cache and
doesn't touch `package-lock.json`.

## Consequences

**Positive**

- The audit is now a real drift detector. New rules in
  `node-red-standards` reach this repo's CI on the first push after they
  land upstream.
- `npx --yes github:...` doesn't touch `node_modules` or the lockfile —
  no more EINTEGRITY when the standards repo advances.
- Dependabot can propose updates to the `github:` short-form reference
  (0.5.0 flagged the pinned form as drift; the current form is unpinned
  and dependabot-visible).
- Node.js CI runs `coverage:check` with declared thresholds — silent
  regressions in coverage now break the build.
- One fewer devDependency and one fewer tarball fetch per `npm ci`.

**Negative**

- A broken commit on the standards repo's `main` breaks every consumer's
  CI simultaneously — no per-repo staging. Mitigated by
  `node-red-standards` having its own `Self-check` CI (Node 20 + 22 plus
  a scaffold-and-audit end-to-end step) that catches such breaks before
  they reach consumers.
- Coverage thresholds set at the measured floor lock in the current
  gaps — future contributors who don't improve coverage don't get flagged
  either. Fine as a floor, not as a target; can be tightened later.

**Trade-offs**

- Chose **freshness over reproducibility**. A drift detector's job is to
  surface drift; a reproducible-but-frozen version defeats that purpose.

## Related

- Code: [.github/workflows/standards-check.yml](../../../.github/workflows/standards-check.yml),
  [.github/workflows/node.js.yml](../../../.github/workflows/node.js.yml),
  [package.json](../../../package.json) (`c8` block).
- CHANGELOG: 0.2.13 (unpin + coverage config + CI adopt current).
- Reversed ADR: [ADR-0010](0010-node-red-standards-adoption.md), item 5.
- Related issue: [windkh/node-red-standards#1](https://github.com/windkh/node-red-standards/issues/1)
  (closed with the reversed conclusion).
