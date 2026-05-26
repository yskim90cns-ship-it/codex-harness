# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                    # 메인 번역 화면
│   └── api/
│       ├── translate/route.ts       # 텍스트 번역 API 프록시
│       └── transcribe/route.ts      # 서버 전사 API가 필요할 때만 사용
├── components/
│   ├── translator/
│   │   ├── TranslatorShell.tsx      # 실시간 번역 화면의 클라이언트 컨테이너
│   │   ├── LanguagePicker.tsx       # 입력/출력 언어 선택
│   │   ├── MicControl.tsx           # 시작/중지 및 권한 상태
│   │   ├── TranscriptPanel.tsx      # 원문 전사 표시
│   │   ├── TranslationPanel.tsx     # 번역 결과 표시
│   │   └── SessionHistory.tsx       # 최근 확정 문장 목록
│   └── ui/                          # 재사용 가능한 순수 UI 컴포넌트
├── hooks/
│   ├── useSpeechSession.ts          # 마이크/음성 인식 세션 상태
│   └── useLiveTranslation.ts        # 전사 텍스트를 번역 요청으로 변환
├── lib/
│   ├── languages.ts                 # 지원 언어 목록 및 유틸
│   ├── errors.ts                    # 사용자 표시용 에러 매핑
│   └── debounce.ts                  # 실시간 요청 제어
├── services/
│   ├── translationService.ts        # 외부 번역 API 래퍼
│   └── transcriptionService.ts      # 서버 전사 API 래퍼가 필요할 때만 작성
└── types/
    ├── language.ts
    ├── speech.ts
    └── translation.ts
```

## 패턴
- Next.js App Router를 사용한다.
- 기본 페이지와 정적 UI는 Server Component로 작성한다.
- 마이크 권한, 실시간 전사, 번역 세션처럼 브라우저 상태가 필요한 영역만 Client Component로 분리한다.
- 외부 API 호출은 반드시 `app/api/*/route.ts` 또는 `services/*`를 통해 서버에서 실행한다.
- Client Component는 외부 번역 API 키, 모델명, 인증 헤더를 직접 알지 못한다.
- 실시간 입력은 작은 단위로 자주 바뀌므로 화면 상태와 API 요청 상태를 분리한다.

## 데이터 흐름
```
사용자 마이크 입력
→ TranslatorShell(Client Component)
→ useSpeechSession
→ 부분 전사/확정 전사 이벤트
→ useLiveTranslation
→ /api/translate
→ services/translationService.ts
→ 외부 번역 API
→ /api/translate 응답
→ TranslationPanel 및 SessionHistory 업데이트
```

서버 전사가 필요한 구현을 선택한 경우:

```
사용자 마이크 입력
→ MediaRecorder 또는 AudioWorklet
→ /api/transcribe
→ services/transcriptionService.ts
→ 외부 전사 API
→ 전사 텍스트
→ /api/translate
→ 번역 결과
```

## 상태 관리
- 전역 상태 라이브러리는 MVP에서 사용하지 않는다.
- `TranslatorShell` 안에서 `useReducer`로 세션 상태를 관리한다.
- 상태는 다음 도메인으로 나눈다.
  - `mic`: `idle | requesting | listening | denied | unsupported`
  - `speech`: 부분 전사, 확정 전사, 마지막 이벤트 시각
  - `translation`: 요청 중 문장, 번역 결과, 오류
  - `history`: 확정된 원문/번역 쌍 목록
- 외부 API 요청은 중복 호출을 줄이기 위해 확정 전사 또는 안정화된 부분 전사에만 실행한다.
- 번역 요청은 최신 입력만 화면에 반영한다. 오래된 응답이 늦게 도착해도 최신 번역을 덮어쓰면 안 된다.

## 오류 처리
- 마이크 권한 거부: 사용자가 브라우저 권한을 다시 열 수 있도록 짧은 안내를 표시한다.
- 브라우저 미지원: 지원 브라우저 안내와 함께 입력 언어/출력 언어 선택은 비활성화하지 않는다.
- 번역 API 실패: 현재 문장은 실패 상태로 표시하고 세션 자체는 유지한다.
- 네트워크 지연: 로딩 상태를 자막 영역 안에서 표시하되 기존 번역 결과를 지우지 않는다.

## 보안 및 개인정보
- API 키는 `.env.local`과 서버 환경 변수에서만 읽는다.
- 원문 음성 또는 전사 텍스트를 서버에 영구 저장하지 않는다.
- MVP에서는 세션 히스토리를 브라우저 메모리에만 유지한다.
- 로그에 원문 음성, 전사 전문, 번역 전문을 남기지 않는다.
