# Step 2: translation-api

## Files To Read

First read these files and understand the architecture and design intent:

- `/AGENTS.md`
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/src/types/language.ts`
- `/src/types/translation.ts`
- `/src/lib/languages.ts`
- `/src/lib/errors.ts`
- `/phases/0-live-voice-translator/index.json`

Read prior-step code carefully before working.

## Task

Implement the server-side translation API boundary with tests. The MVP must be runnable without a real external API key, but the code must keep the external-provider boundary server-side.

Add or update these files:

- `/src/services/translationService.ts`
- `/src/app/api/translate/route.ts`
- Unit tests for request validation, same-language behavior, successful provider calls, and provider error mapping.

Required interfaces:

```ts
export interface TranslationServiceInput {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslationService {
  translate(input: TranslationServiceInput): Promise<string>;
}

export function createTranslationService(): TranslationService;
```

Behavior requirements:

- `POST /api/translate` accepts `TranslateRequestBody` and returns `TranslateResponseBody`.
- Empty text returns HTTP 400 with a short error message.
- Unsupported language codes return HTTP 400.
- If `sourceLanguage === targetLanguage`, return the input text without calling any external provider.
- If no real provider environment variable is configured, use a deterministic local fallback that makes development and tests usable. The fallback must clearly mark itself as a mock translation, such as `[English] original text`.
- External API keys must only be read in `translationService.ts` or server route code.
- Do not log raw transcript or translated text.

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
   - Success: `"status": "completed"`, `"summary": "Server-only translation route and service boundary added with validation and tests"`
   - Failure after 3 fix attempts: `"status": "error"`, `"error_message": "specific error"`
   - User action required: `"status": "blocked"`, `"blocked_reason": "specific reason"`, then stop immediately.

## Prohibited

- Do not call any external translation or AI API from Client Components. Reason: credentials and provider details must remain server-side.
- Do not require a real API key for tests or local build. Reason: MVP must be runnable by default.
- Do not store or log source text or translated text. Reason: PRD privacy requirement.
- Do not build UI components in this step. Reason: this step owns server API only.
- Do not break existing tests.
