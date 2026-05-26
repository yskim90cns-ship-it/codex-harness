# Step 1: domain-model

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/UI_GUIDE.md`
- `/package.json`
- `/src/app/page.tsx`
- `/src/app/globals.css`
- `/phases/0-live-voice-translator/index.json`

Read prior-step code carefully before working.

## Task

Create the shared domain model and pure utilities for supported languages, speech session state, translation requests, and user-facing errors. Write tests before implementation.

Add or update these files:

- `/src/types/language.ts`
- `/src/types/speech.ts`
- `/src/types/translation.ts`
- `/src/lib/languages.ts`
- `/src/lib/errors.ts`
- `/src/lib/debounce.ts`
- Unit tests colocated near the modules or under `/src/**/*.test.ts`.

Required interfaces:

```ts
export type LanguageCode = "ko" | "en" | "ja" | "zh" | "es";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  speechRecognitionCode: string;
}

export type MicStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "denied"
  | "unsupported";

export interface SpeechSegment {
  id: string;
  text: string;
  isFinal: boolean;
  language: LanguageCode;
  createdAt: number;
}

export interface TranslationPair {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  createdAt: number;
}

export interface TranslateRequestBody {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslateResponseBody {
  translatedText: string;
}
```

Utility requirements:

- `SUPPORTED_LANGUAGES` must include Korean, English, Japanese, Chinese, and Spanish.
- `getLanguageByCode(code)` returns a language option or `undefined`.
- `isSupportedLanguageCode(value)` narrows unknown input to `LanguageCode`.
- `createUserError(error)` maps unknown errors into short user-facing messages without exposing sensitive details.
- `debounce` must be testable without React.

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
   - Success: `"status": "completed"`, `"summary": "Shared language, speech, translation, error, and debounce modules added with unit tests"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not implement UI components in this step. Reason: this step owns domain types and pure utilities only.
- Do not call browser speech APIs in this step. Reason: speech runtime belongs in the speech-session step.
- Do not add external translation providers in this step. Reason: server API belongs in the translation-api step.
- Do not break existing tests.
