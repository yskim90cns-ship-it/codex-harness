# Step 0: project-foundation

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`
- `/package.json`
- `/scripts/run_tests.py`
- `/scripts/test_execute.py`

## Task

Convert the repository from a Harness-only template into a runnable Next.js application foundation for Live Voice Translator while preserving the existing Harness scripts and tests.

Implement the foundation in a TDD-compatible way:

1. Update `/AGENTS.md` so it no longer contains template placeholders. It must describe:
   - Project name: `Live Voice Translator`
   - Stack: Next.js App Router, TypeScript strict mode, Tailwind CSS, Vitest
   - CRITICAL architecture rules:
     - External translation/transcription/model APIs must only be called from `src/app/api/*/route.ts` or server-side services.
     - Client Components must never read API keys, model credentials, or call external AI APIs directly.
     - Voice/transcript/translation text must not be persisted or logged by default.
   - TDD process and commands.
2. Add a minimal Next.js App Router structure:
   - `/src/app/layout.tsx`
   - `/src/app/page.tsx`
   - `/src/app/globals.css`
3. Add project config files required for TypeScript strict mode, Next, Tailwind, PostCSS, ESLint, and Vitest:
   - `/tsconfig.json`
   - `/next-env.d.ts`
   - `/next.config.ts` or `/next.config.mjs`
   - `/tailwind.config.ts`
   - `/postcss.config.mjs`
   - `/eslint.config.mjs` or the project-compatible ESLint config
   - `/vitest.config.ts`
   - `/src/test/setup.ts`
4. Update `/package.json` scripts:
   - `dev`: `next dev`
   - `build`: `next build`
   - `lint`: project lint command
   - `test`: must continue to run the existing Python Harness tests and the new TypeScript tests
5. Install and record dependencies needed for this foundation:
   - Runtime: `next`, `react`, `react-dom`, `lucide-react`
   - Dev: `typescript`, React/Node types, Tailwind/PostCSS, ESLint config for Next, `vitest`, `jsdom`, React Testing Library, jest-dom
6. Add one minimal smoke test for the landing page render. The page may initially render a static shell only.

Required interfaces or files:

```ts
// src/app/page.tsx
export default function Home(): JSX.Element;
```

## Acceptance Criteria

```bash
npm run build
npm test
```

## Verification

1. Run the AC commands.
2. Check the architecture checklist:
   - Does the work follow the `ARCHITECTURE.md` directory structure?
   - Does it stay within the `ADR.md` technology stack?
   - Does it avoid violating `AGENTS.md` CRITICAL rules?
3. Update `phases/0-live-voice-translator/index.json` for this step:
   - Success: `"status": "completed"`, `"summary": "Next.js/Tailwind/Vitest foundation created with updated AGENTS.md and smoke test"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not remove or break `/scripts/execute.py`, `/scripts/run_tests.py`, or `/scripts/test_execute.py`. Reason: Harness remains part of the repository workflow.
- Do not add authentication, persistence, billing, or upload features. Reason: PRD excludes them from MVP.
- Do not call external APIs from the browser. Reason: API credentials must stay server-side.
- Do not break existing tests.
