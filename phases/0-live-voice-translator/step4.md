# Step 4: translator-ui

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`
- `/src/app/page.tsx`
- `/src/app/globals.css`
- `/src/hooks/useSpeechSession.ts`
- `/src/hooks/useLiveTranslation.ts`
- `/src/lib/languages.ts`
- `/phases/0-live-voice-translator/index.json`

Read prior-step code carefully before working.

## Task

Build the real-time translator interface using the existing hooks and API. Write component tests before implementation where practical.

Add or update these files:

- `/src/components/translator/TranslatorShell.tsx`
- `/src/components/translator/LanguagePicker.tsx`
- `/src/components/translator/MicControl.tsx`
- `/src/components/translator/TranscriptPanel.tsx`
- `/src/components/translator/TranslationPanel.tsx`
- `/src/components/translator/SessionHistory.tsx`
- `/src/app/page.tsx`
- `/src/app/globals.css`
- Component tests for core UI states.

UI requirements:

- First screen must be the usable translator tool, not a marketing landing page.
- Provide input and output language selection.
- Provide a clear start/stop microphone control.
- Show mic status, unsupported browser state, permission denial, and translation errors.
- Show source transcript and translated text in separate panels.
- Show partial transcript with lower contrast and final transcript with stronger contrast.
- Show recent translation history.
- Use the colors, spacing, typography, and anti-pattern rules in `UI_GUIDE.md`.
- Use `lucide-react` icons if available.
- Ensure accessible labels for icon buttons and live status text.

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
   - Success: `"status": "completed"`, `"summary": "Translator UI components wired to speech and translation hooks with responsive dark tool layout"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not create a marketing hero or explanatory landing page. Reason: PRD and UI guide require the tool as the first screen.
- Do not add gradient orbs, glassmorphism, purple AI branding, or glow effects. Reason: UI guide explicitly prohibits AI slop patterns.
- Do not call external APIs directly from UI components. Reason: Client Components must use local hooks and `/api/translate`.
- Do not persist transcripts or translations. Reason: privacy rule.
- Do not break existing tests.
