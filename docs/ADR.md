# Architecture Decision Records

## Philosophy
이 프로젝트는 Harness 작업 상태를 빠르게 이해하기 위한 로컬 개발 도구다. MVP는 정확한 읽기 모델, 작은 의존성 표면, 테스트 가능한 수집 로직을 우선한다.

---

### ADR-001: Local-first read-only dashboard
**Decision**: 대시보드는 기본적으로 로컬 파일과 Git working tree를 읽기만 한다.

**Reason**: Harness의 핵심 상태는 이미 `phases/` 파일과 Git working tree에 존재한다. MVP에서 UI 쓰기 기능을 열면 상태 손상, branch 변경, commit 부작용의 위험이 커진다.

**Tradeoff**: 대시보드에서 바로 재실행, 커밋, 정리 작업을 수행할 수 없다. 그런 작업은 기존 CLI와 `scripts/execute.py`가 담당한다.

### ADR-002: Next.js App Router for the web UI
**Decision**: 브라우저 대시보드는 Next.js App Router 기반으로 구현한다.

**Reason**: 로컬 개발 서버, route handler, server component를 같은 프로젝트 안에서 다룰 수 있고, 파일시스템 접근을 서버 경계에 둘 수 있다.

**Tradeoff**: 단순 정적 HTML보다 초기 설정이 크다. 대신 대시보드가 커질 때 API/UI 경계를 유지하기 쉽다.

### ADR-003: Framework-independent collectors
**Decision**: Harness 상태 수집 로직은 `dashboard/collector.mjs`처럼 프레임워크에 묶이지 않은 순수 Node 모듈로 유지한다.

**Reason**: 수집 로직은 UI보다 안정성이 중요하며, `node:test`로 빠르게 검증할 수 있어야 한다. 이 구조는 CLI, API route, 테스트에서 같은 로직을 재사용하게 해준다.

**Tradeoff**: UI 계층에서 바로 파일을 읽는 것보다 어댑터 코드가 필요하다.

### ADR-004: Filesystem watch plus Git status for file changes
**Decision**: MVP의 파일 변화 표시는 filesystem watch 이벤트와 Git working tree 상태를 함께 사용한다.

**Reason**: Git status는 added/modified/deleted/untracked의 신뢰 가능한 현재 상태를 제공하고, filesystem watch는 개발 중 저장/생성/삭제 이벤트 흐름을 자동 갱신에 사용할 수 있다.

**Tradeoff**: watch 이벤트는 운영체제별 차이가 있고 중복/누락 가능성이 있다. 따라서 watch 이벤트는 최근 활동 신호로 사용하고, 최종 파일 상태 분류는 Git status로 재검증한다.

### ADR-005: No database for MVP
**Decision**: MVP는 데이터베이스를 사용하지 않는다.

**Reason**: 현재 요구사항은 현재 작업 디렉토리 상태를 보여주는 것이다. 상태를 중복 저장하면 동기화 오류가 생긴다.

**Tradeoff**: 과거 세션 분석, 장기 통계, 사용자별 설정 저장은 MVP 범위 밖이다.

### ADR-006: Auto-refresh is part of the MVP
**Decision**: 대시보드는 자동 갱신을 MVP에 포함한다.

**Reason**: 사용자는 개발 중 파일 변화와 Harness 실행 상태를 보기 위해 대시보드를 사용한다. 수동 새로고침만 제공하면 핵심 사용 흐름이 터미널 확인과 크게 다르지 않다.

**Tradeoff**: watch 서비스, refresh interval, pause/resume UI가 필요해진다. 자동 갱신은 읽기 전용 데이터 재수집으로 제한한다.

### ADR-007: Dashboard as a generated example app
**Decision**: 대시보드는 Harness 템플릿의 핵심 실행기 기능이 아니라, Harness로 생성되는 예시 앱 형태로 제공한다. 생성 시 기본 포함이 아니라 옵션으로 선택한다.

**Reason**: Harness 실행기의 책임은 phase/step 실행과 메타데이터 관리다. 대시보드는 그 상태를 보여주는 제품 예시로 분리하는 편이 템플릿 사용자가 수정/확장하기 쉽다.

**Tradeoff**: 모든 Harness 프로젝트가 반드시 대시보드를 갖지는 않는다. 대신 대시보드가 필요 없는 프로젝트의 초기 표면적을 줄이고, 선택한 프로젝트에는 문서화된 경계와 테스트를 포함한다.

### ADR-008: Inline output summaries only
**Decision**: MVP는 step 출력의 요약과 최근 일부 stdout/stderr만 인라인으로 보여준다.

**Reason**: 대시보드의 핵심은 상태 파악이다. 전체 로그 뷰어와 다운로드 기능은 파일 처리, 큰 출력 성능, UI 탐색 범위를 넓힌다.

**Tradeoff**: 사용자가 전체 실행 로그를 보려면 로컬 파일을 직접 열어야 한다. 대시보드는 어떤 step output 파일을 확인해야 하는지 명확히 안내한다.
