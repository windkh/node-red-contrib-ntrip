# ADR-0010: Adopt `node-red-standards` as the tool-neutral rule source

## Status

Accepted in 0.2.11.

## Context

By v0.2.9 the repo had accumulated conventions that were hard to keep in
sync across sibling repos: modular layout, ESLint flat config, Prettier
settings, `node:test` migration, single-exit style, `engines.node`,
CHANGELOG format, ADR requirements. Each was documented separately —
partly in `CLAUDE.md`, partly in AGENTS-style comments, partly implicit in
templates.

A related repo (`windkh/node-red-standards`) was set up to hold all of that
as a tool-neutral, machine-auditable standard: an `AGENTS.md` template
readable by any AI assistant, detailed rule docs under `doc/rules/`, an
`nrstd audit` command that enforces the mechanical parts (file structure,
scripts, engine version, etc.).

Options considered:

- **Adopt the standard fully.** Add `node-red-standards` as a devDep, sync
  the managed AGENTS.md block, migrate tests to `node:test`, thin
  `CLAUDE.md` to an adapter.
- **Copy the rules manually into CLAUDE.md.** Simpler short term, but drifts
  the moment the standard changes.
- **Leave the current conventions alone.** Keeps the repo self-contained
  but loses the maintenance leverage.

## Decision

Adopt the standard. Concretely:

1. `AGENTS.md` at the repo root, with the shared rules in a managed block
   (rewritten by `nrstd sync`) plus a project-specific rules section that
   is never overwritten.
2. `CLAUDE.md` slimmed to a thin adapter (`@AGENTS.md` + Claude-specific
   notes only).
3. Test suite migrated from Mocha + Chai to `node --test` + `node:assert`.
   Specs renamed `*.spec.js → *.test.js`.
4. `.github/workflows/standards-check.yml` runs `npx nrstd audit` on every
   push/PR against `main`.
5. `node-red-standards` declared as a **pinned tarball** devDependency
   (`https://codeload.github.com/windkh/node-red-standards/tar.gz/<sha>`)
   so `npm ci` installs it locally and CI just invokes `npx nrstd audit`
   after install — no separate network fetch, no EINTEGRITY drift when the
   standards repo advances.
6. `engines.node` bumped to `>=20.0.0`; CI matrix trimmed to `20.x, 22.x`.
7. Source refactored to single-exit style across all node files (one
   `return` per function at the last statement).

Divergences from the template are intentional and documented (see the
"Not overwritten by `nrstd sync`" section below).

## Consequences

**Positive**

- `nrstd audit` is a single machine check the CI enforces — no more manual
  cross-repo drift audits.
- The AGENTS.md rules load into every AI assistant (Claude Code, Cursor,
  Codex, Copilot Chat, …) as a first-class instruction file.
- `CLAUDE.md` becomes a stable few-lines adapter — rule changes happen
  centrally, the adapter stays the same.
- `node:test` drops the Mocha + Chai dep tree (also drops chai's ESM-only
  v5 dependabot noise).

**Negative**

- The pinned tarball URL is manual to bump. When the standards repo
  releases a new version, someone has to update the SHA in this repo's
  `package.json` and regenerate the lock. Dependabot cannot auto-bump git
  URLs.
- Two files (`AGENTS.md` and `CLAUDE.md`) instead of one to explain the
  rules to a new contributor.
- Standards-check CI is a hard gate — a repo that drifts from the standard
  can't merge until it re-syncs.

**Trade-offs**

- Chose the **pinned tarball** over the template's `npx --yes github:...`
  because the latter fetched a floating URL on every job — vulnerable to
  transient E404 and EINTEGRITY. Manual SHA bumps are the price of
  reproducible CI.

## Not overwritten by `nrstd sync`

`nrstd sync --write` reports six files as `differs (kept; use --force)` in
this repo. They are intentional divergences:

- `.github/workflows/standards-check.yml` — uses `npm ci` + `npx nrstd
  audit` (installed devDep) instead of `npx --yes github:...` (floating).
  See windkh/node-red-standards#1.
- `.github/workflows/npm-publish.yml` — tag-triggered publish (`push: tags:
  ['v*', 'V*']`) plus auto-created GitHub Release, rather than the
  template's `release: published` trigger.
- `.github/dependabot.yml` — ignore list for a few known-unfixable
  transitive advisories.
- `eslint.config.js` / `.prettierrc.json` — local `printWidth: 160` instead
  of the template's 120.
- `.claude/settings.json` — repo-specific permissions.

## Related

- Code: [AGENTS.md](../../../AGENTS.md), [CLAUDE.md](../../../CLAUDE.md),
  [.github/workflows/standards-check.yml](../../../.github/workflows/standards-check.yml),
  `package.json` (`devDependencies.node-red-standards`).
- Upstream: [windkh/node-red-standards](https://github.com/windkh/node-red-standards).
- Related ADRs:
  [ADR-0007](0007-mocha-test-helper-stack.md) — the mocha stack this
  supersedes.
- CHANGELOG: 0.2.11 "Adopted `node-red-standards` …".
