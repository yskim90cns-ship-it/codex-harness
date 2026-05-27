# Live Voice Translator 실행 가이드

이 문서는 외부 전달자가 프로젝트를 받은 뒤 바로 실행할 수 있도록 정리한 가이드입니다.

## 1. Windows에서 바로 실행

### 준비물

- Node.js 20 이상
- 마이크 사용이 가능한 Chrome 브라우저
- 번역 API 사용을 위한 인터넷 연결

### 일반 실행

압축을 푼 폴더에서 아래 파일을 더블클릭합니다.

```bat
start-windows.bat
```

또는 PowerShell에서 실행합니다.

```powershell
.\start-windows.ps1
```

스크립트는 다음 작업을 자동으로 수행합니다.

- `.env`가 없으면 `.env.example`을 복사합니다.
- `node_modules`가 없으면 `npm install`을 실행합니다.
- `npm run dev`로 `http://localhost:3000` 서버를 시작합니다.
- 서버가 준비되면 브라우저를 자동으로 엽니다.

기본 Windows 실행은 `/api/translate`를 통해 공개 MyMemory 번역 엔드포인트를 호출합니다.
그래도 `/api/translate`는 Next.js 서버 안에서 함께 실행됩니다.

서버를 종료하려면 실행 중인 창에서 `Ctrl+C`를 누릅니다.

### 프로덕션 실행

프로덕션 빌드가 꼭 필요할 때만 아래 파일을 사용합니다.

```bat
start-production-windows.bat
```

이 방식은 `npm run build`를 먼저 실행하므로 일반 실행보다 메모리를 더 많이 사용합니다.

### 개발 서버 실행

개발 모드 전용 파일도 제공합니다.

```bat
dev-windows.bat
```

또는 PowerShell에서 실행합니다.

```powershell
.\dev-windows.ps1
```

개발 서버도 기본 주소는 `http://localhost:3000`입니다.

## 2. Docker로 실행(선택)

### 준비물

- Docker Desktop 또는 Docker Engine
- 마이크 사용이 가능한 Chrome 브라우저
- 번역 API 사용을 위한 인터넷 연결

### 실행

```sh
cp .env.example .env
docker build -t live-voice-translator .
docker run --rm -p 3000:3000 --env-file .env live-voice-translator
```

브라우저에서 `http://localhost:3000`을 엽니다.

Chrome에서 마이크 권한을 허용해야 음성 인식이 동작합니다.

### 오프라인 데모 모드

실제 번역 API 호출 없이 화면 흐름만 확인하려면 `.env`에 아래 값을 넣습니다.

```sh
TRANSLATION_PROVIDER=mock
```

이 모드에서는 번역 결과가 `[Korean] hello`처럼 표시됩니다.

## 3. 로컬 Node.js 실행

### 준비물

- Node.js 20 이상
- npm
- 마이크 사용이 가능한 Chrome 브라우저

### 개발 서버

```sh
npm install
npm run dev
```

브라우저에서 Next.js가 출력한 로컬 주소를 엽니다. 기본값은 `http://localhost:3000`입니다.

개발 서버 산출물은 `.next-dev`에 생성됩니다.

### 프로덕션 실행

```sh
npm install
npm run build
npm run start
```

프로덕션 빌드 산출물은 `.next`에 생성됩니다.

## 4. 번역 API 설정

기본 전달본은 별도 설정 없이 공개 MyMemory 번역 엔드포인트를 사용합니다.

오프라인 데모처럼 실제 번역 API 호출을 피하려면 `.env`에서 `TRANSLATION_PROVIDER=mock` 줄을 주석 해제합니다.
이 경우 번역 결과는 `[English] 안녕하세요`처럼 데모 형식으로 표시됩니다.

별도 번역 서비스를 연결하려면 `.env` 또는 서버 환경 변수에 아래 값을 설정합니다.

```sh
TRANSLATION_API_URL=https://provider.example/translate
TRANSLATION_API_KEY=replace-me
```

커스텀 번역 서비스는 아래 응답 형식을 반환해야 합니다.

```json
{ "translatedText": "translated text" }
```

## 5. 검증 명령

```sh
npm run build
npm run test
```

`npm run test`는 Python Harness 체크와 Vitest 테스트를 함께 실행합니다. 로컬에 `pytest`가 없으면 Harness 체크는 건너뛰고 Vitest가 실행됩니다.

## 6. 문제 해결

- 창이 멈춘 것처럼 보임: `npm run start` 또는 `npm run dev` 이후에는 서버가 실행 중이라 창이 계속 멈춰 있는 것처럼 보이는 것이 정상입니다. 브라우저에서 `http://localhost:3000`을 여세요.
- 처음 실행이 오래 걸림: `npm install`과 `npm run build`는 인터넷 속도와 PC 성능에 따라 몇 분 걸릴 수 있습니다.
- `zone allocation failed`가 나옴: 대개 `npm run build` 중 Node.js 메모리 할당이 실패한 것입니다. Windows에서는 `start-production-windows.bat` 대신 `start-windows.bat`를 사용하세요.
- `next`는 내부 또는 외부 명령이 아니라고 나옴: 의존성 설치가 중간에 실패했거나 `node_modules`가 불완전한 상태입니다. 폴더 안의 `node_modules`를 삭제한 뒤 `start-windows.bat`를 다시 실행하세요.
- `/api/translate`에서 에러가 남: `start-windows.bat`도 API route를 함께 실행합니다. 인터넷 연결 또는 번역 provider 상태를 확인하세요. 오프라인 확인만 필요하면 `.env`에서 `TRANSLATION_PROVIDER=mock`을 주석 해제하세요.
- 글자가 깨져 보임: 최신 `start-windows.bat`는 UTF-8 코드페이지를 먼저 설정합니다. 기존 압축본을 받았다면 최신 압축본으로 다시 실행하세요.
- 포트 충돌: 이미 `3000`번 포트를 쓰고 있다면 기존 프로세스를 종료하거나 `npm run start -- --port 3001`처럼 다른 포트를 지정합니다.
- 새로고침 후 화면 깨짐: 개발 서버를 종료한 뒤 `rm -rf .next-dev`를 실행하고 `npm run dev`를 다시 실행합니다.
- 마이크가 동작하지 않음: Chrome 주소창 왼쪽 권한 메뉴에서 마이크 권한을 허용합니다.
- 번역이 실패함: 인터넷 연결을 확인하거나 `TRANSLATION_PROVIDER=mock`으로 데모 모드를 사용합니다.
