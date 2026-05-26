# Step 5: verification-polish

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`
- `/src/app/page.tsx`
- `/src/app/globals.css`
- `/src/components/translator/TranslatorShell.tsx`
- `/src/hooks/useSpeechSession.ts`
- `/src/hooks/useLiveTranslation.ts`
- `/src/app/api/translate/route.ts`
- `/phases/0-live-voice-translator/index.json`

Read prior-step code carefully before working.

## Task

Perform final MVP verification and polish. This step should fix integration issues, improve tests where gaps are found, and make the project ready to run locally.

Tasks:

1. Review the implementation against all docs.
2. Add or improve tests for any uncovered critical behavior:
   - Translation route validation
   - Unsupported speech browser handling
   - Latest translation response wins
   - UI shows status/error text accessibly
3. Ensure `README.md` explains:
   - What Live Voice Translator is
   - How to install dependencies
   - How to run dev/build/test
   - How translation works without a real provider key
   - Privacy note: transcripts are not stored by default
4. Ensure no template placeholders remain in project docs, README, or AGENTS.
5. Ensure `npm run lint`, `npm run build`, and `npm test` pass.

## Acceptance Criteria

```bash
npm run lint
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
   - Success: `"status": "completed"`, `"summary": "MVP verified, README updated, placeholders removed, lint/build/test passing"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not introduce new product scope such as auth, billing, saved sessions, file upload, or room sharing. Reason: PRD excludes them from MVP.
- Do not weaken tests to make commands pass. Reason: this step is verification, not test removal.
- Do not log or persist transcript/translation text. Reason: privacy rule.
- Do not break existing tests.
