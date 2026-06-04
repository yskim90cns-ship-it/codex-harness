# Project: Harness Local Change Dashboard

## Tech Stack
- Next.js App Router for the local web dashboard
- TypeScript strict mode for application code
- Node.js ESM modules for framework-independent collectors and scripts
- `node:test` for collector/unit tests
- Tailwind CSS or plain CSS modules may be used for UI styling, but keep the visual system aligned with `docs/UI_GUIDE.md`

## Architecture Rules
- CRITICAL: The dashboard is read-only by default. UI and API code must not mutate source files, phase metadata, Git branches, commits, remotes, or working tree state unless a future ADR explicitly permits it.
- CRITICAL: Client Components must not call filesystem APIs, Git commands, child processes, or external local-process APIs directly. Use Server Components, route handlers, or server-only services.
- CRITICAL: Keep Harness state collection framework-independent. Core parsing and normalization logic belongs in `dashboard/`, `src/lib/`, or `src/services/`, with focused tests before UI integration.
- CRITICAL: Do not parse JSON, Git status, or step output inside React presentation components. Components receive normalized data and render it.
- CRITICAL: Filesystem watch logic must be server-only, scoped to the current project root, and must ignore `.git/`, `node_modules/`, `.next/`, `.next-dev/`, release artifacts, and generated cache/build directories.
- CRITICAL: Automatic refresh must be read-only. It may re-read files, Git status, and in-memory watch events, but it must not trigger Harness execution, commits, branch changes, or file writes.
- Use `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, and `docs/UI_GUIDE.md` as the source of truth before implementing dashboard features.
- Place reusable UI in `src/components/`, shared types in `src/types/`, local service wrappers in `src/services/`, and pure helpers in `src/lib/`.
- Preserve the Harness phase contract documented in `.codex/skills/harness/SKILL.md`; do not add timestamps during phase file creation because `scripts/execute.py` owns transition timestamps.

## Development Process
- CRITICAL: New features must start with tests first, then an implementation that makes those tests pass.
- CRITICAL: When the user invokes `$harness` or asks to use Harness engineering, do not implement source changes directly. First read `docs/`, `AGENTS.md`, and `.codex/skills/harness/SKILL.md`, then propose a phase/step plan. Create `phases/` files only after user approval, and run `python3 scripts/execute.py <task>` only after the user approves execution.
- CRITICAL: For `$harness` work, the visible implementation must be produced through Harness phase execution. A valid run creates or updates `phases/index.json`, `phases/<task>/index.json`, `phases/<task>/stepN.md`, and later `stepN-output.json` via `scripts/execute.py`.
- CRITICAL: If the user asks to "develop", "implement", or "proceed" in a `$harness` request, interpret that as "prepare and execute Harness phases", not as permission to edit application/source files directly. Only bypass this if the user explicitly says direct implementation is allowed.
- For dashboard collector changes, add or update `node:test` coverage near the collector.
- For UI or route-handler changes, add the narrowest useful test coverage available in the project setup.
- Keep changes scoped to the requested phase or feature. Do not refactor unrelated Harness executor behavior while building dashboard features.
- Respect existing user changes in the working tree. Do not revert generated files or unrelated edits unless explicitly requested.
- Commit messages must follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:`.

## Commands
```bash
npm run dev      # local development server
npm run build    # production build or configured build check
npm run lint     # lint check
npm run test     # test suite
```

## Clarification Triggers
Ask the project owner before implementing when one of these choices materially affects the product:
- Whether the dashboard may eventually write state, rerun steps, or trigger commits.
- Whether the opt-in generation flow should be a CLI flag, an interactive prompt, or a template selection.
