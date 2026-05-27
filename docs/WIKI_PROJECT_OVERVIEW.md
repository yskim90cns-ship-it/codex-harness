# Live Voice Translator 프로젝트 구성 및 Harness 엔지니어링 문서

## 1. 프로젝트 개요

Live Voice Translator는 브라우저에서 마이크 음성을 인식하고, 확정된 전사 텍스트를 서버 API를 통해 번역해 실시간 자막처럼 보여주는 MVP 웹 애플리케이션이다.

주요 목표는 다음과 같다.

- 별도 네이티브 앱 없이 브라우저에서 음성 번역을 실행한다.
- 마이크 권한, 음성 인식, 번역 요청, 오류 상태를 한 화면에서 명확히 보여준다.
- 외부 번역 API 호출과 인증 정보는 서버 경계 안에 둔다.
- 음성, 전사, 번역 텍스트는 기본적으로 저장하거나 로그에 남기지 않는다.

## 2. 기술 스택
    
| 영역 | 사용 기술 |
| --- | --- |
| 웹 프레임워크 | Next.js App Router |
| 언어 | TypeScript strict mode |
| UI | React, Tailwind CSS, lucide-react |
| 테스트 | Vitest, React Testing Library, jsdom |
| Harness 실행 | Python 기반 `scripts/execute.py`, `scripts/run_tests.py` |
| 배포/전달 | Dockerfile, Windows 실행 스크립트, tar.gz release archive |

주요 npm 명령은 다음과 같다.

```sh
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

`npm run test`는 Python Harness 테스트 진입점인 `scripts/run_tests.py`와 Vitest 테스트를 함께 실행한다.

## 3. 현재 실행 구성

### 3.1 로컬 개발 실행

```sh
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행된다. 개발 산출물은 `.next-dev`에 생성되며, 프로덕션 빌드 산출물 `.next`와 분리되어 있다.

이 분리는 개발 서버가 실행 중일 때 `npm run build`가 `.next`를 갱신하면서 dev 서버의 chunk 참조가 깨지는 문제를 줄이기 위한 구성이다.

### 3.2 프로덕션 실행

```sh
npm install
npm run build
npm run start
```

프로덕션 빌드는 `.next`에 생성된다.

### 3.3 Windows 전달 실행

외부 Windows 사용자용 실행 파일은 다음과 같다.

| 파일 | 용도 |
| --- | --- |
| `start-windows.bat` | 일반 실행용. `npm run dev`로 앱과 API를 함께 실행한다. |
| `start-windows.ps1` | `start-windows.bat`가 호출하는 PowerShell 스크립트 |
| `dev-windows.bat` | 개발 서버 실행용 |
| `dev-windows.ps1` | `dev-windows.bat`가 호출하는 PowerShell 스크립트 |
| `start-production-windows.bat` | 프로덕션 빌드가 꼭 필요할 때만 사용 |
| `start-production-windows.ps1` | 프로덕션 빌드 후 `npm run start` 실행 |

Windows 기본 실행은 메모리 사용량을 줄이기 위해 `npm run build`를 수행하지 않는다. `zone allocation failed` 같은 Node/V8 메모리 할당 오류는 주로 프로덕션 빌드 단계에서 발생할 수 있으므로, 일반 전달본에서는 `start-windows.bat` 사용을 권장한다.

`start-windows.bat`는 다음 작업을 수행한다.

- UTF-8 코드페이지 설정
- Node.js와 npm 존재 확인
- `.env`가 없으면 `.env.example` 기반으로 생성
- `node_modules\.bin\next.cmd`가 없으면 `npm install` 실행
- Next.js dev 서버 시작
- 서버 준비 후 브라우저 자동 열기

### 3.4 Docker 실행

Docker는 선택 사항이다. Docker Desktop 또는 Docker Engine이 설치된 환경에서만 사용할 수 있다.

```sh
cp .env.example .env
docker build -t live-voice-translator .
docker run --rm -p 3000:3000 --env-file .env live-voice-translator
```

현재 `Dockerfile`은 `node:20-alpine` 기반 multi-stage build를 사용한다. 프로젝트에 `public/` 디렉터리가 없어도 Docker build가 실패하지 않도록 build stage에서 `public` 디렉터리를 생성한다.

## 4. 번역 Provider 구성

클라이언트는 외부 번역 API를 직접 호출하지 않는다. 브라우저에서는 항상 내부 API인 `/api/translate`만 호출한다.

```text
Client Component
→ useLiveTranslation
→ /api/translate
→ services/translationService.ts
→ mock, MyMemory, or custom provider
```

현재 지원 모드는 다음과 같다.

| 모드 | 조건 | 동작 |
| --- | --- | --- |
| Mock | `TRANSLATION_PROVIDER=mock` | 외부 API 없이 `[English] 원문` 형태의 데모 번역 반환 |
| Custom provider | `TRANSLATION_API_URL`, `TRANSLATION_API_KEY` 설정 | 지정된 provider에 POST 요청 |
| MyMemory fallback | 위 설정이 모두 없음 | 공개 MyMemory 번역 엔드포인트 호출 |

외부 전달본의 `.env.example`은 안정적인 실행 확인을 위해 `TRANSLATION_PROVIDER=mock`을 기본값으로 둔다. 실제 번역을 사용하려면 `.env`에서 해당 줄을 제거하거나 주석 처리한다.

Custom provider는 아래 응답 형식을 반환해야 한다.

```json
{ "translatedText": "translated text" }
```

## 5. 애플리케이션 아키텍처

### 5.1 디렉터리 구조

```text
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       └── translate/route.ts
├── components/
│   └── translator/
│       ├── TranslatorShell.tsx
│       ├── LanguagePicker.tsx
│       ├── MicControl.tsx
│       ├── TranscriptPanel.tsx
│       ├── TranslationPanel.tsx
│       └── SessionHistory.tsx
├── hooks/
│   ├── useSpeechSession.ts
│   └── useLiveTranslation.ts
├── lib/
│   ├── debounce.ts
│   ├── errors.ts
│   └── languages.ts
├── services/
│   └── translationService.ts
├── test/
│   └── setup.ts
└── types/
    ├── language.ts
    ├── speech.ts
    └── translation.ts
```

### 5.2 책임 분리

| 계층 | 책임 |
| --- | --- |
| `src/app/page.tsx` | Server Component로 첫 화면 구성 |
| `TranslatorShell` | 브라우저 상태가 필요한 클라이언트 컨테이너 |
| `useSpeechSession` | SpeechRecognition API 세션, 마이크 상태, 전사 상태 관리 |
| `useLiveTranslation` | 확정 전사 텍스트를 `/api/translate` 요청으로 변환 |
| `src/app/api/translate/route.ts` | 요청 검증, 서버 번역 서비스 호출, 오류 매핑 |
| `translationService.ts` | mock/custom/MyMemory 번역 provider 선택과 호출 |
| `src/lib/*` | 지원 언어, 사용자 오류 메시지, debounce 등 순수 유틸 |
| `src/types/*` | 언어, 음성, 번역 도메인 타입 |

### 5.3 데이터 흐름

```text
사용자 마이크 입력
→ Browser SpeechRecognition API
→ useSpeechSession
→ partialTranscript / finalTranscript
→ useLiveTranslation
→ POST /api/translate
→ createTranslationService()
→ translation provider
→ TranslationPanel / SessionHistory
```

중복 번역 요청이 겹칠 수 있으므로, `useLiveTranslation`은 최신 요청 ID를 기준으로 가장 최근 응답만 화면에 반영한다.

## 6. UI 구성

첫 화면은 마케팅 랜딩 페이지가 아니라 실제 번역 도구 화면이다.

주요 UI 요소는 다음과 같다.

- 입력 언어와 출력 언어 선택
- 언어 swap 버튼
- 마이크 시작/중지 버튼
- 마이크 권한, listening, unsupported, denied 상태 표시
- 원문 전사 패널
- 번역 결과 패널
- 최근 번역 히스토리
- 오류 메시지와 live region 기반 상태 알림

디자인은 고정 다크 모드, 고대비 텍스트, 자막 가독성을 우선한다. 장식적 랜딩 hero, 과한 gradient, glassmorphism, 불필요한 AI 스타일 장식은 사용하지 않는다.

## 7. 보안 및 개인정보 원칙

이 프로젝트의 핵심 보안 원칙은 다음과 같다.

- 외부 번역, 전사, 모델 API 호출은 `src/app/api/*/route.ts` 또는 서버 사이드 `services/*`에서만 수행한다.
- Client Component는 API 키, 모델 인증 정보, 외부 AI API 호출 로직을 직접 읽거나 포함하지 않는다.
- 음성, 전사, 번역 텍스트는 기본적으로 저장하지 않는다.
- 서버 오류 응답과 로그에는 원문 전사나 번역 전문을 포함하지 않는다.
- 세션 히스토리는 현재 브라우저 메모리에만 유지되며 새로고침 시 사라진다.

## 8. 테스트 구성

테스트는 Vitest 기반으로 구성되어 있고, React UI 테스트는 jsdom과 React Testing Library를 사용한다.

주요 테스트 범위는 다음과 같다.

| 파일 영역 | 검증 내용 |
| --- | --- |
| `src/lib/*.test.ts` | 지원 언어, 오류 매핑, debounce |
| `src/services/translationService.test.ts` | mock/provider/MyMemory 번역 서비스 동작 |
| `src/app/api/translate/route.test.ts` | 요청 검증, 400/502 오류 매핑, 정상 번역 응답 |
| `src/hooks/useSpeechSession.test.ts` | SpeechRecognition 지원 여부, 상태 전이, start/stop |
| `src/hooks/useLiveTranslation.test.ts` | `/api/translate` 호출, 최신 응답 우선 |
| `src/components/translator/translator-ui.test.tsx` | UI 상태, 접근성, 히스토리 렌더링 |
| `src/app/page.test.tsx` | 메인 페이지 smoke test |

`vitest.config.ts`는 `release/**`, `.next/**`, `.next-dev/**`, `node_modules/**`를 테스트 검색 대상에서 제외한다. 릴리즈 압축 준비물이 테스트에 중복 포함되는 문제를 방지하기 위한 설정이다.

## 9. Harness 엔지니어링 구성

이 저장소는 일반 Next.js 앱과 함께 Harness 기반 작업 실행 구조를 포함한다.

### 9.1 Harness 목적

Harness는 기능 구현을 여러 단계로 나누고, 각 단계를 독립적인 Codex 실행 단위로 관리하기 위한 구조다. 목표는 다음과 같다.

- 단계별 작업 범위 명확화
- 각 단계의 입력 문서와 수정 대상 명시
- Acceptance Criteria를 실행 가능한 명령으로 고정
- 단계 상태를 JSON 메타데이터로 추적
- 기존 Harness 스크립트와 테스트를 깨뜨리지 않는 개발 흐름 유지

### 9.2 관련 파일

| 파일 | 역할 |
| --- | --- |
| `phases/index.json` | 전체 phase 목록과 상태 |
| `phases/0-live-voice-translator/index.json` | Live Voice Translator phase의 step 상태 |
| `phases/0-live-voice-translator/step*.md` | 각 구현 단계의 작업 지시서 |
| `scripts/execute.py` | pending step을 Codex 실행 단위로 처리하는 Harness 실행기 |
| `scripts/run_tests.py` | npm test에서 호출되는 Python Harness 테스트 진입점 |
| `scripts/test_execute.py` | Harness 실행기 테스트 |

### 9.3 구현 phase 요약

현재 phase는 `0-live-voice-translator`이며 완료 상태다.

| Step | 이름 | 산출물 요약 |
| --- | --- | --- |
| 0 | `project-foundation` | Next.js, Tailwind, Vitest 기반 프로젝트 구성 |
| 1 | `domain-model` | 언어, 음성, 번역 타입과 순수 유틸 작성 |
| 2 | `translation-api` | 서버 전용 번역 API route와 service boundary 구현 |
| 3 | `speech-session` | 브라우저 음성 인식 hook과 live translation hook 구현 |
| 4 | `translator-ui` | 실제 번역 도구 UI 컴포넌트 구성 |
| 5 | `verification-polish` | README, 접근성 테스트, lint/build/test 검증 |

### 9.4 Step 파일 규칙

각 step 파일은 다음 구조를 따른다.

- `Files To Read`: 작업 전 읽어야 하는 문서와 코드
- `Task`: 구체적인 구현 범위
- `Acceptance Criteria`: 실행해야 할 검증 명령
- `Verification`: 아키텍처, ADR, AGENTS 규칙 체크
- `Prohibited`: 하지 말아야 할 작업과 이유

이 구조는 각 단계가 독립 실행되어도 필요한 맥락을 잃지 않도록 만든다.

### 9.5 Harness 개발 원칙

Harness 기반 작업은 다음 원칙을 따른다.

- 새 기능은 테스트를 먼저 작성하고 구현한다.
- 외부 API 호출은 서버 route/service 경계 안에 둔다.
- 음성/전사/번역 데이터는 저장하거나 로그에 남기지 않는다.
- 단계별 완료 시 `phases/.../index.json`에 `status`, `summary`, timestamp를 기록한다.
- 실패 시 `error_message`, 사용자 조치 필요 시 `blocked_reason`을 남긴다.
- 각 단계의 acceptance criteria는 `npm run build`, `npm run test`, 필요 시 `npm run lint`처럼 실행 가능한 명령으로 작성한다.

## 10. 릴리즈 및 전달 구성

외부 전달용 파일은 `release/live-voice-translator-0.1.0.tar.gz`로 생성한다.

압축에서 제외하는 항목은 다음과 같다.

- `node_modules`
- `.git`
- `.next`
- `.next-dev`
- `release`
- `.env`
- `.DS_Store`

전달본에는 다음 파일이 포함된다.

- 애플리케이션 소스
- `package.json`, `package-lock.json`
- `.env.example`
- Windows 실행 스크립트
- Dockerfile
- `README.md`
- `RUN_GUIDE.md`
- `docs/` 문서
- Harness phase와 scripts

## 11. 운영상 주의점

- Windows 기본 실행은 `start-windows.bat`를 안내한다.
- Docker 실행은 Docker Desktop 또는 Docker Engine 설치가 필요하므로 선택 사항으로 안내한다.
- 실제 번역 API를 쓰려면 `.env`에서 `TRANSLATION_PROVIDER=mock`을 제거하고 provider 설정을 검토한다.
- `next` 명령 오류는 대개 의존성 설치 실패이므로 `node_modules` 삭제 후 재실행한다.
- `zone allocation failed`는 production build 메모리 문제일 가능성이 높으므로 일반 실행 경로를 사용한다.
- 브라우저 음성 인식은 Chrome 계열 브라우저에서 확인하는 것이 가장 안정적이다.

## 12. 최근 검증 상태

최근 확인된 검증 명령은 다음과 같다.

```sh
npm run build
npm run test
```

검증 결과:

- `npm run build` 통과
- `npm run test` 통과
- Vitest 기준 9개 테스트 파일, 48개 테스트 통과
- `TRANSLATION_PROVIDER=mock` 환경에서 `POST /api/translate` 정상 응답 확인

