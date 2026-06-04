# PRD: Harness Local Change Dashboard

## Goal
개발 중 Harness 프로젝트에서 발생하는 로컬 파일 변화와 phase/step 실행 상태를 한 화면에서 확인할 수 있는 로컬 전용 대시보드를 제공한다.

## Users
- Harness 기반으로 Codex 작업을 실행하는 개발자
- 여러 phase/step의 진행 상태, 실패 사유, 산출물을 빠르게 확인해야 하는 프로젝트 오너

## Problem
현재 Harness는 `phases/` 메타데이터와 실행 로그를 파일로 남기지만, 개발자는 변경 상태를 확인하기 위해 터미널 명령과 JSON/Markdown 파일을 직접 오가야 한다. 이 과정은 작업 흐름을 끊고, 실패/차단 상태나 최근 파일 변화를 놓치기 쉽다.

## MVP Scope
1. 로컬 작업 디렉토리의 Harness 상태 요약
   - `phases/index.json`과 `phases/*/index.json`을 읽어 phase/step 상태를 집계한다.
   - completed, pending, blocked, error 상태별 개수와 진행률을 표시한다.
2. 최근 실행 타임라인
   - phase/step의 `started_at`, `completed_at`, `failed_at`, `blocked_at` 필드를 시간순으로 표시한다.
   - step별 `summary`, `error_message`, `blocked_reason`을 확인할 수 있게 한다.
3. 로컬 파일 변화 확인
   - Git working tree 기준으로 added, modified, deleted, untracked 파일을 표시한다.
   - filesystem watch 이벤트를 수집해 저장, 생성, 삭제, 이름 변경 같은 개발 중 변화 흐름을 자동 반영한다.
   - Harness 산출물(`phases/`, `step*-output.json`)과 소스/문서 변경을 구분한다.
4. 실행 출력 확인
   - `stepN-output.json`이 있으면 exit code, stdout, stderr 요약을 표시한다.
   - 긴 출력은 UI와 API 레이어에서 제한해 대시보드가 느려지지 않게 한다.
   - MVP는 요약과 최근 일부 출력만 인라인으로 보여준다.
5. 로컬 전용 개발 서버
   - 기본 사용은 `npm run dev`로 시작하는 로컬 웹 대시보드다.
   - 외부 서비스나 원격 저장소 API 없이 동작한다.
6. 자동 갱신
   - 대시보드는 watch 이벤트와 주기적 재검증을 사용해 별도 수동 새로고침 없이 최신 상태를 보여준다.
   - 자동 갱신은 일시정지/재개할 수 있어야 한다.

## MVP Exclusions
- 파일 diff의 라인 단위 시각화
- Git commit 생성, branch 전환, push 같은 쓰기 작업
- 원격 협업 기능, 인증, 사용자 계정
- 여러 프로젝트를 동시에 감시하는 워크스페이스 관리
- 실행 중인 Codex 세션의 실시간 stdout 스트리밍
- 대시보드에서 Harness phase/step을 직접 실행하거나 커밋하는 기능
- 전체 로그 파일 다운로드 또는 전체 로그 뷰어

## Success Criteria
- 개발자가 브라우저에서 현재 phase/step 상태와 최근 실패/차단 이유를 10초 안에 파악할 수 있다.
- filesystem watch 이벤트와 `git status --short`로 보던 로컬 파일 변화가 대시보드에 일관되게 반영된다.
- 파일을 직접 수정하지 않아도 대시보드 조회 기능은 프로젝트 상태를 바꾸지 않는다.
- 사용자가 저장한 파일 변화가 자동 갱신을 통해 짧은 시간 안에 화면에 반영된다.
- `npm run lint`, `npm run build`, `npm run test`가 통과한다.

## Product Decisions
- 파일 변화 감지는 filesystem watch 이벤트까지 포함한다.
- 대시보드는 자동 갱신을 MVP에 포함한다.
- 이 대시보드는 Harness로 생성되는 예시 앱 형태로 제공한다.
- step 출력은 요약과 최근 일부 출력만 인라인으로 표시한다.
- 생성되는 예시 앱에서 대시보드는 기본 포함이 아니라 생성 옵션으로 선택한다.
