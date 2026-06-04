# Architecture

## System Shape
Harness Local Change Dashboard is a local-first example web app generated with Harness projects. It reads project state from the working tree and renders a browser UI for phase progress, step output, and file changes.

The dashboard must be read-only by default. It can inspect files and Git status, but it must not mutate source files, phase metadata, commits, branches, or remote repositories from the UI unless a future ADR explicitly approves that behavior.

## Directory Structure
```text
dashboard/
  collector.mjs          # Pure data collection helpers for Harness phase state
  collector.test.mjs     # Node test coverage for collector behavior
src/
  app/                   # Next.js App Router pages and route handlers
  components/            # Reusable UI components
  lib/                   # Pure helpers shared by server/UI code
  services/              # Local service wrappers such as Git/Harness readers
  types/                 # TypeScript type definitions
docs/
  PRD.md
  ARCHITECTURE.md
  ADR.md
  UI_GUIDE.md
phases/
  index.json
  <phase>/index.json
  <phase>/stepN.md
  <phase>/stepN-output.json
```

## Data Sources
- Harness phase index: `phases/index.json`
- Harness phase detail: `phases/*/index.json`
- Step execution output: `phases/*/stepN-output.json`
- Local file changes: filesystem watch events plus Git working tree status from the current repository root
- Project guardrails: `AGENTS.md` and `docs/*.md`

## Data Flow
```text
Browser UI
  -> Next.js Server Component or Route Handler
  -> local collectors/services
  -> filesystem watch state, filesystem reads, and git read operations
  -> normalized dashboard view model
  -> UI render
```

Client Components may handle interaction state such as filters, tabs, search input, and selected step detail. They must not call filesystem, Git, or external process APIs directly.

## Module Boundaries
- `dashboard/collector.mjs` remains framework-independent and testable with `node:test`.
- Next.js route handlers may adapt collector output into API responses for the UI.
- Git status collection should live behind a small service function with a stable return type.
- Filesystem watch collection should live behind a server-only service with bounded in-memory event history.
- UI components receive already-normalized data; they should not parse Harness JSON or shell output.

## State Management
- Server state is derived on request from local files and Git status.
- Server watch state is kept in memory and can be rebuilt from the filesystem and Git status if the dev server restarts.
- Client state is limited to presentation concerns: selected phase, selected step, filters, refresh interval, and auto-refresh pause/resume state.
- No database is used for the MVP.
- A server-side watch process is allowed for the example app MVP, but it must be scoped to the current project root and ignore heavy/generated directories.

## Watch and Refresh
- Watch filesystem events for source, docs, phase metadata, and dashboard files.
- Ignore `.git/`, `node_modules/`, `.next/`, `.next-dev/`, release artifacts, and other generated cache/build directories.
- Keep only a bounded recent event list so long-running dev sessions do not leak memory.
- Combine watch events with periodic Git status reads because watch events do not provide clean Git classifications.
- The UI should auto-refresh from the normalized dashboard endpoint and provide a pause/resume control.

## Error Handling
- Missing `phases/index.json` should not crash the dashboard; discover `phases/*` directories when possible.
- Invalid JSON should be represented as a readable warning for the affected phase or output file.
- Git command failures should produce a visible degraded state, not an empty dashboard.
- Watch setup failures should fall back to manual/interval refresh and show a warning.
- Long stdout/stderr values must be truncated before they reach UI components.

## Testing Strategy
- New behavior starts with tests, following `AGENTS.md`.
- Pure collectors use Node's built-in `node:test`.
- Route handlers and UI behavior should add focused tests once the app shell exists.
- Acceptance commands for dashboard work are:

```bash
npm run lint
npm run build
npm run test
```
