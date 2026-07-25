# AGENTS.md — node-red-contrib-ntrip

Portable coding rules for this Node-RED node package. Tool-neutral: read natively by Codex,
Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed and (via import) Claude Code.
This file is the single source of truth for how to work in this repo. Keep it self-contained.

## Architecture
- Node packages are modular: `lib/` holds framework-independent, unit-testable core logic;
  `nodes/` holds one file per Node-RED node; `icons/` holds node icons.
- The registered entry file (`<pkg>/99-<name>.js`) is a thin delegator that only `require`s and
  registers the modules in `nodes/`. Keep runtime glue thin.
- Record non-trivial design decisions as an ADR in `doc/architecture/adr/`.

## Code style
- Lint: ESLint flat config (`eslint.config.js`), ESLint >= 9. Run the lint script before committing.
- Format: Prettier (`.prettierrc.json`) — 4-space indent, single quotes, es5 trailing commas.
- Target Node.js >= 20. Use `const`/`let`, never `var`.

## Tests
- Node's built-in test runner (`node --test`) + `node-red-node-test-helper`. Tests live in `test/` as `*.test.js`.
  Import `{ describe, it }` from `node:test` and assert with `node:assert`. Coverage via `c8`.
- Add or update tests for every behavioural change. Keep pure logic in `lib/` unit-tested;
  test node wiring via the helper.

## Documentation
- `README.md` is user-facing. Architecture docs live under `doc/architecture/`
  (`overview.md`, `structural-design.md`, `behavioural-design.md`, `adr/`).
- Update `CHANGELOG.md` (Keep a Changelog style) for every user-visible change; bump the
  patch version in `package.json` in the same commit.

## Workflow
- CI (`.github/workflows/node.js.yml`) must pass: lint, format:check, test, coverage.
- Releases go through `.github/workflows/npm-publish.yml`.
- Never bump the major version without an ADR explaining the breaking change.

## Standard package.json scripts
`lint`, `lint:fix`, `format`, `format:check`, `test` (`node --test`), `coverage` (`c8 node --test`), `coverage:check`.
