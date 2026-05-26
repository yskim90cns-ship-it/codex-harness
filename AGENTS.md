# 프로젝트: Live Voice Translator

## 기술 스택
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Vitest

## 아키텍처 규칙
- CRITICAL: 외부 번역, 전사, 모델 API 호출은 `src/app/api/*/route.ts` 또는 서버 사이드 `services/*`에서만 수행한다.
- CRITICAL: Client Components는 API 키, 모델 인증 정보, 외부 AI API 호출 로직을 직접 읽거나 포함하지 않는다.
- CRITICAL: 음성, 전사, 번역 텍스트는 기본적으로 저장하거나 로그에 남기지 않는다.
- 기본 페이지와 정적 UI는 Server Component로 작성한다.
- 브라우저 상태가 필요한 마이크, 실시간 전사, 번역 세션 영역만 Client Component로 분리한다.
- 컴포넌트는 `src/components/`, 훅은 `src/hooks/`, 공용 유틸은 `src/lib/`, 타입은 `src/types/`에 둔다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)
- 기존 Harness 스크립트와 테스트를 깨뜨리지 않는다.

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # Python Harness 테스트와 TypeScript 테스트
