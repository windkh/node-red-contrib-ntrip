# ADR-0007: Mocha + node-red-node-test-helper for the test suite

## Status

Accepted in 0.2.6.

## Context

Up to 0.2.5 the package had no automated tests — three patch releases in two
weeks shipped regressions that an even minimal suite would have caught.
Adding tests was overdue. Choices:

- **Mocha** vs **Jest** as the runner. Mocha is the dominant choice for
  published `node-red-contrib-*` packages; Jest's auto-mocking and snapshotting
  add nothing this package needs.
- **`node-red-node-test-helper`** vs **direct invocation of node factories
  with a hand-rolled `RED` stub**. The helper spins up a real Node-RED runtime
  in-process, loads a flow, and exposes wired nodes. A hand-rolled stub would
  let tests run faster but would not exercise the real lifecycle hooks
  (`registerType`, `createNode`, `node.receive`, `node.send`) — which is
  exactly where the recent regressions lived.
- **`chai` v4 vs v5.** v5 is ESM-only. The package is CommonJS and there is
  no reason to move it; pin v4.

## Decision

- Mocha for the test runner.
- `node-red-node-test-helper` for the in-process Node-RED runtime.
- `chai` v4 for the assertion DSL.
- `node-red` itself as a dev dep (required by the helper from v0.3 onwards).

Tests live under `test/` with one `*.spec.js` per node. Each previously-fixed
regression has a dedicated test tagged `(regression: …)` so they can be run
in isolation with `mocha -g regression`.

CI runs `npm test` across the existing matrix (Node 18 / 20 / 22).

## Consequences

**Positive**

- Real Node-RED runtime — tests verify the actual `registerType` + `createNode`
  + `node.send` path, not a stub.
- Each spec file is small (~100 LOC) and self-contained.
- Regression tests are explicit — visible in test names, locked in for the
  long term.
- CI gate prevents accidental regressions on every push.

**Negative**

- `node-red` is a ~400-package dev dependency tree, with some known
  vulnerabilities (all dev-only, not reachable in the published artefact).
- First test run is slower (~80 ms helper startup) than a unit test on plain
  functions would be.
- Spec authors have to learn the `helper.load(...)` + `helper.getNode(...)`
  +`on('input', …)` pattern — slight learning curve.

**Trade-offs**

- Chose **realism** over **speed and small dep tree**. For four nodes with
  tight Node-RED integration, integrating the real runtime is worth the
  weight.

## Related

- Code: [test/](../../../test/) and [.github/workflows/node.js.yml](../../../.github/workflows/node.js.yml)
- Statistics: [statistics.md](../statistics.md) "Test suite" section
