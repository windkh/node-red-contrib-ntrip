# ADR-0001: Single registration file for all nodes

## Status

Accepted (original design).

## Context

Node-RED loads a contribution package via the `node-red.nodes` map in
`package.json`. That map can point at one or many entry files: each entry file
is run once at startup and is expected to call `RED.nodes.registerType(...)`
for the node types it owns.

Two viable patterns exist:

- **One entry per node.** `package.json` lists four entries; each file
  registers exactly one type. Pro: a node's entire definition is in one place.
  Con: four entries to keep in sync, four loader invocations.
- **One entry for the whole package.** `package.json` lists one entry; that
  file `require`s each node implementation and registers them all. Pro:
  centralised; package version logging happens once.

## Decision

Use a single registration entry file: [ntrip/99-ntrip.js](../../../ntrip/99-ntrip.js).
The `99-` prefix is a convention seen across published `node-red-contrib-*`
packages — it sorts late alphabetically, making the file easy to find.

Each node implementation lives under [ntrip/nodes/](../../../ntrip/nodes/) and
exports a factory function that the registration file imports.

The four node types' editor UIs share one HTML file
([ntrip/99-ntrip.html](../../../ntrip/99-ntrip.html)) — Node-RED's loader picks
up the `.html` next to the registered `.js`.

## Consequences

**Positive**

- One place to read the full inventory of nodes.
- Package version logging happens exactly once at load time (read from
  `package.json`).
- New nodes are added by a one-line `require` + one-line `registerType` in the
  entry file, plus a new file under `nodes/` and a new `<script>` block in the
  HTML.

**Negative**

- The HTML file is large (~470 lines) because it must hold form templates and
  help text for all four nodes. Adding a fifth node means appending another
  ~100 lines to the same file.
- A typo in `registerType` names (e.g. `NtripClinet` instead of `NtripClient`)
  is silently fatal — the JS side and HTML side must agree exactly.

**Trade-offs**

- Choosing the single-entry pattern prioritises *package coherence* over
  *per-node isolation*. If the package ever grows to a dozen+ nodes, splitting
  would become attractive.

## Related

- Code: [ntrip/99-ntrip.js](../../../ntrip/99-ntrip.js), [ntrip/99-ntrip.html](../../../ntrip/99-ntrip.html)
- Configured via: [package.json](../../../package.json) `node-red.nodes`
