# Step 3: speech-session

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/src/types/language.ts`
- `/src/types/speech.ts`
- `/src/types/translation.ts`
- `/src/lib/languages.ts`
- `/src/lib/errors.ts`
- `/src/app/api/translate/route.ts`
- `/phases/0-live-voice-translator/index.json`

Read prior-step code carefully before working.

## Task

Implement browser speech-session and live-translation hooks with tests. This step owns client runtime logic, not visual polish.

Add or update these files:

- `/src/hooks/useSpeechSession.ts`
- `/src/hooks/useLiveTranslation.ts`
- Unit tests for reducer/state transition logic and live translation request ordering.

Required exported API:

```ts
export interface SpeechSessionState {
  micStatus: MicStatus;
  partialTranscript: string;
  finalTranscript: string;
  errorMessage: string | null;
  lastUpdatedAt: number | null;
}

export interface SpeechSessionControls {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useSpeechSession(inputLanguage: LanguageCode): {
  state: SpeechSessionState;
  controls: SpeechSessionControls;
};

export interface LiveTranslationState {
  translatedText: string;
  isTranslating: boolean;
  errorMessage: string | null;
  history: TranslationPair[];
}

export function useLiveTranslation(params: {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  finalTranscript: string;
}): LiveTranslationState;
```

Behavior requirements:

- Detect unsupported browser speech recognition and set `micStatus` to `unsupported`.
- Request microphone/speech recognition only when `start()` is called.
- Keep partial and final transcript separate.
- Stop recognition cleanly when `stop()` is called.
- Do not persist transcript or translation text.
- `useLiveTranslation` must call `/api/translate`, not external providers.
- If multiple translation requests overlap, only the latest response may update the visible translated text.
- Tests may mock browser speech recognition and `fetch`.

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
   - Success: `"status": "completed"`, `"summary": "Speech session and live translation hooks added with mocked browser/fetch tests"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not read API keys or provider credentials in hooks. Reason: hooks run in the browser.
- Do not store transcripts in localStorage, sessionStorage, cookies, or server storage. Reason: MVP privacy rule.
- Do not implement the full visual UI in this step. Reason: UI belongs in translator-ui.
- Do not break existing tests.
