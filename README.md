# Live Voice Translator

Live Voice Translator is a browser-based MVP for real-time speech translation.
It uses the browser SpeechRecognition API for microphone transcription, sends
confirmed transcript text to a server-side Next.js API route, and shows the
translated result as readable live subtitles.

The first screen is the working translator UI: choose source and target
languages, start the microphone, read the original transcript, and follow the
latest translation plus in-memory session history.

## 압축본으로 바로 실행하기

아래 절차는 `live-voice-translator-0.1.0.tar.gz` 압축 파일을 받은 사람이
번역 동작까지 확인하는 기준 절차입니다.

### 1. 압축 풀기

빈 폴더를 하나 만들고 그 안에서 압축을 풉니다. 현재 압축 파일은 최상위
프로젝트 폴더를 한 번 더 감싸지 않고 파일들이 바로 풀리는 구조입니다.

```sh
mkdir live-voice-translator
cd live-voice-translator
tar -xzf live-voice-translator-0.1.0.tar.gz
```

Windows에서 압축 프로그램으로 풀었다면 압축을 푼 폴더 안에서 PowerShell을
열면 됩니다.

### 2. 준비물 확인

- Node.js 20 이상
- Chrome 브라우저
- 마이크 권한
- 인터넷 연결

브라우저 음성 인식은 Chrome에서 가장 안정적으로 동작합니다. 실제 번역은 서버
라우트가 공개 MyMemory 번역 API를 호출하므로 인터넷 연결이 필요합니다.

### 3. 환경 파일 확인

처음 실행할 때 `.env`가 없으면 실행 스크립트가 `.env.example`을 복사합니다.
실제 번역을 확인하려면 `.env`에 아래 줄이 켜져 있으면 안 됩니다.

```env
TRANSLATION_PROVIDER=mock
```

`.env`에 이 줄이 있다면 삭제하거나 `#`로 주석 처리합니다.

```env
# TRANSLATION_PROVIDER=mock
```

`mock`이 켜져 있으면 실제 번역 API를 호출하지 않고 `[Korean] hello` 같은 데모
문구만 표시합니다.

### 4. Windows에서 실행

압축을 푼 폴더에서 아래 파일을 더블클릭합니다.

```bat
start-windows.bat
```

또는 PowerShell에서 실행합니다.

```powershell
.\start-windows.ps1
```

처음 실행하면 `npm install` 때문에 시간이 걸릴 수 있습니다. 창에
`http://localhost:3000` 주소가 보이면 Chrome에서 해당 주소를 엽니다. 실행 중인
터미널 창은 서버이므로 닫지 않습니다.

### 5. macOS/Linux에서 실행

```sh
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

### 6. 번역 API 먼저 확인

화면에서 마이크를 쓰기 전에 `/api/translate`가 실제 번역을 반환하는지 먼저
확인할 수 있습니다.

macOS/Linux:

```sh
curl -sS http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕하세요","sourceLanguage":"ko","targetLanguage":"en"}'
```

Windows PowerShell:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/translate" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"text":"안녕하세요","sourceLanguage":"ko","targetLanguage":"en"}'
```

정상이라면 아래처럼 원문이 아닌 번역 결과가 나옵니다. 실제 문구는 provider
응답에 따라 조금 달라질 수 있습니다.

```json
{ "translatedText": "Hello" }
```

만약 `{ "translatedText": "안녕하세요" }`처럼 원문이 그대로 나오면 From과 To가
같은 언어인지 확인합니다. 이 앱은 같은 언어 요청에서는 provider를 호출하지 않고
원문을 그대로 반환합니다.

### 7. 화면에서 확인

1. `From`을 말하는 언어로 고릅니다. 예: `Korean`
2. `To`를 번역할 언어로 고릅니다. 예: `English`
3. 두 언어가 같지 않은지 확인합니다.
4. `Start listening`을 누릅니다.
5. Chrome의 마이크 권한 요청을 허용합니다.
6. 짧은 문장을 말하고 잠시 기다립니다.

브라우저 SpeechRecognition API는 중간 음성 인식 결과와 확정 결과를 나눕니다.
이 앱은 확정된 문장이 생긴 뒤 `/api/translate`를 호출하므로, 말을 하는 즉시
글자가 매 프레임 바뀌는 방식이 아닐 수 있습니다. 짧게 말하고 1-2초 정도 멈추면
확정 문장과 번역 결과가 표시됩니다.

## Install

For handoff and deployment instructions, see `RUN_GUIDE.md`.

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
Development output is written to `.next-dev`, while production builds use
`.next`.

## Run In Production

```sh
npm install
npm run build
npm run start
```

By default the server listens on port `3000`.

## Run With Docker (recommended for sharing)

```sh
cp .env.example .env
docker build -t live-voice-translator .
docker run --rm -p 3000:3000 --env-file .env live-voice-translator
```

Open `http://localhost:3000`.

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

Without `TRANSLATION_API_URL` and `TRANSLATION_API_KEY`, the service uses the
public MyMemory translation endpoint from the server route, so the local MVP can
translate between the supported languages without exposing client-side secrets.
Same-language requests still return the original text.

For deterministic offline demos and tests, uncomment
`TRANSLATION_PROVIDER=mock` in `.env`. Different target languages then return a
visible mock value such as `[Korean] hello`.

To connect a provider, set these server environment variables:

```sh
TRANSLATION_API_URL=https://provider-url
TRANSLATION_API_KEY=provider-key
```

The configured provider is expected to accept the translation request JSON and
return `{ "translatedText": "..." }`.

## Troubleshooting

- Translation shows the original text: make sure `From` and `To` are different
  languages. Same-language requests intentionally return the original text.
- Translation shows `[Korean] hello` or `[English] ...`: `.env` has
  `TRANSLATION_PROVIDER=mock` enabled. Remove that line or comment it out.
- Translation API returns an error: check internet access from the machine
  running the server. The default provider is called from the Next.js server,
  not directly from the browser.
- Microphone does not start: use Chrome and allow microphone permission from the
  icon next to the address bar.
- Text appears in the transcript but translation is delayed: pause after a short
  sentence. The app translates confirmed speech results, not every interim
  recognition fragment.
- Port 3000 is already in use: stop the other process or run
  `npm run dev -- --port 3001` and open `http://localhost:3001`.

## Privacy

Voice, transcript, and translation text are not stored by default. Session
history is kept only in browser memory for the current page session, and server
errors avoid echoing transcript or translation content back to logs or users.
