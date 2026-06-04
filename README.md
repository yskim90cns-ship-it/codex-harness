# Codex Harness Template

Phase/step 기반으로 Codex 작업을 순차 실행하고, 각 step 결과를 커밋으로 분리하는 템플릿입니다.

## 설치

```sh
npm install
python3 -m pip install pytest
```

Codex CLI는 별도로 설치되어 있어야 합니다.

## Hook 활성화

`.codex/config.toml`을 Codex 설정으로 사용하면 다음 훅이 동작합니다.

- `PreToolUse`: 파일 수정 전에 Codex용 로컬 TDD precheck 실행
- `Stop`: `npm run lint`, `npm run build`, `npm run test`, Python 실행기 테스트 실행

TDD precheck는 `.codex/hooks/tdd-precheck.mjs`에 있으며 외부 hook 패키지에 의존하지 않습니다. 구현 파일을 수정하는 hook payload에 테스트 파일 변경이 함께 없으면 JSON block 결정을 반환합니다.

## Phase 작성법

`phases/<phase-dir>/index.json`에 step 목록을 정의하고, 각 step은 `stepN.md` 파일로 작성합니다.

```json
{
  "project": "ExampleProject",
  "phase": "example",
  "steps": [
    {
      "step": 0,
      "name": "setup",
      "status": "pending",
      "summary": ""
    }
  ]
}
```

Step 파일에는 목표, 작업 범위, Acceptance Criteria를 명확히 적습니다. 실행기는 `pending` step을 찾아 Codex에 전달하고, step이 `completed`, `blocked`, `error` 중 하나로 상태를 갱신하기를 기대합니다.

## 실행 예시

```sh
python3 scripts/execute.py 0-example
python3 scripts/execute.py 0-example --push
```

기본 실행은 Codex의 일반 sandbox/approval 정책을 따릅니다. 신뢰할 수 있는 로컬 프로젝트에서만 다음 옵션을 사용할 수 있습니다.

```sh
python3 scripts/execute.py 0-example --dangerous-bypass-sandbox
```

## npm scripts

템플릿에는 다음 script 예시가 포함되어 있습니다.

```sh
npm run lint
npm run build
npm run test
```

실제 프로젝트에 맞게 `lint`, `build`, `test` 명령을 교체해서 사용하세요.
