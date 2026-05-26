# Live Voice Translator

Live Voice Translator is a browser-based MVP for real-time speech translation.
It uses the browser SpeechRecognition API for microphone transcription, sends
confirmed transcript text to a server-side Next.js API route, and shows the
translated result as readable live subtitles.

The first screen is the working translator UI: choose source and target
languages, start the microphone, read the original transcript, and follow the
latest translation plus in-memory session history.

## Install

```sh
npm install
```

Python 3 is also required because `npm run test` includes the Harness test
runner through `scripts/run_tests.py`.

## Run Locally

```sh
npm run dev
```

Then open the local URL printed by Next.js. Use a browser with speech
recognition support, such as Chrome, and allow microphone access when prompted.

## Build And Test

```sh
npm run lint
npm run build
npm run test
```

`npm run test` runs both the Python Harness checks and the Vitest suite.

## Translation Provider

The app calls `/api/translate` from the client. That route creates a server-side
translation service, so provider URLs and API keys stay out of the client
bundle.

Without `TRANSLATION_API_URL` and `TRANSLATION_API_KEY`, the service uses a local
mock translator. Same-language requests return the original text, and different
target languages return a visible mock value such as `[Korean] hello`. This lets
the MVP run and pass tests without a real provider key.

To connect a provider, set these server environment variables:

```sh
TRANSLATION_API_URL=https://provider-url
TRANSLATION_API_KEY=provider-key
```

The configured provider is expected to accept the translation request JSON and
return `{ "translatedText": "..." }`.

## Privacy

Voice, transcript, and translation text are not stored by default. Session
history is kept only in browser memory for the current page session, and server
errors avoid echoing transcript or translation content back to logs or users.
