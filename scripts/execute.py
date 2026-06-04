#!/usr/bin/env python3
# 이 파일을 터미널에서 바로 실행할 때 사용할 Python 실행기를 알려준다.
"""
Harness Step Executor — phase 내 step을 순차 실행하고 자가 교정한다.

Usage:
    python3 scripts/execute.py <phase-dir> [--push] [--dangerous-bypass-sandbox]
"""
# 위 큰따옴표 블록은 파일 설명과 사용법이다. 프로그램 실행에는 영향을 주지 않는다.

import argparse
# argparse: 터미널 명령어 옵션과 인자를 읽는 표준 도구다.
import contextlib
# contextlib: with 문으로 쓸 수 있는 작은 도구를 만들 때 사용한다.
import json
# json: index.json, step-output.json 같은 JSON 파일을 읽고 쓸 때 사용한다.
import os
# os: 현재 환경변수를 복사하고 수정할 때 사용한다.
import subprocess
# subprocess: git, codex 같은 외부 명령어를 Python에서 실행할 때 사용한다.
import sys
# sys: 프로그램을 종료하거나 stderr에 진행 표시를 출력할 때 사용한다.
import threading
# threading: 진행 표시 스피너를 별도 작업으로 돌릴 때 사용한다.
import time
# time: 경과 시간을 재고 잠깐 기다릴 때 사용한다.
import types
# types: 간단한 속성 묶음(SimpleNamespace)을 만들 때 사용한다.
from datetime import datetime, timezone, timedelta
# datetime 도구들: 한국 시간 기준 timestamp를 만들 때 사용한다.
from pathlib import Path
# Path: 문자열보다 안전하게 파일 경로를 다루기 위한 도구다.
from typing import Optional
# Optional: 값이 있거나 None일 수 있다는 타입 힌트를 표현한다.

ROOT = Path(__file__).resolve().parent.parent
# ROOT는 이 저장소의 루트 경로다. scripts/execute.py 기준으로 두 단계 위가 프로젝트 루트다.


@contextlib.contextmanager
# 아래 함수를 with progress_indicator(...) 형태로 쓸 수 있게 만든다.
def progress_indicator(label: str):
    # Codex가 일하는 동안 터미널에 빙글빙글 도는 진행 표시를 보여주는 함수다.
    """터미널 진행 표시기. with 문으로 사용하며 .elapsed 로 경과 시간을 읽는다."""
    # 사용자에게 보여줄 스피너 모양들이다.
    frames = "◐◓◑◒"
    # stop 이벤트는 스피너 thread에게 "이제 멈춰"라고 알려주는 신호다.
    stop = threading.Event()
    # t0는 시작 시각이다. 나중에 지금 시각에서 빼서 경과 시간을 계산한다.
    t0 = time.monotonic()

    def _animate():
        # _animate는 별도 thread에서 계속 화면을 갱신하는 내부 함수다.
        idx = 0
        # stop.wait(0.12)는 0.12초 기다리되 stop 신호가 오면 True를 돌려준다.
        while not stop.wait(0.12):
            # 현재까지 몇 초 지났는지 정수로 계산한다.
            sec = int(time.monotonic() - t0)
            # \r은 줄을 새로 만들지 않고 같은 줄 맨 앞으로 돌아간다는 뜻이다.
            sys.stderr.write(f"\r{frames[idx % len(frames)]} {label} [{sec}s]")
            # 출력 버퍼를 즉시 비워서 화면에 바로 보이게 한다.
            sys.stderr.flush()
            # 다음 반복에서는 다음 스피너 모양을 쓰도록 숫자를 1 올린다.
            idx += 1
        # 작업이 끝나면 기존 진행 표시 글자를 공백으로 덮어 지운다.
        sys.stderr.write("\r" + " " * (len(label) + 20) + "\r")
        # 지운 결과도 즉시 화면에 반영한다.
        sys.stderr.flush()

    # daemon=True라서 메인 프로그램이 끝나면 이 thread도 같이 정리된다.
    th = threading.Thread(target=_animate, daemon=True)
    # 스피너 thread를 시작한다.
    th.start()
    # with 블록 바깥으로 경과 시간을 전달하기 위한 아주 작은 객체다.
    info = types.SimpleNamespace(elapsed=0.0)
    try:
        # 여기서 with 블록 안의 실제 작업이 실행된다.
        yield info
    finally:
        # with 블록이 성공하든 실패하든 스피너에게 멈추라고 알린다.
        stop.set()
        # 스피너 thread가 완전히 끝날 때까지 기다린다.
        th.join()
        # 최종 경과 시간을 info.elapsed에 기록한다.
        info.elapsed = time.monotonic() - t0


class StepExecutor:
    # StepExecutor는 phase 디렉토리의 step들을 순서대로 실행하는 핵심 클래스다.
    """Phase 디렉토리 안의 step들을 순차 실행하는 하네스."""

    MAX_RETRIES = 3
    # 한 step이 실패했을 때 최대 3번까지 다시 시도한다.
    FEAT_MSG = "feat({phase}): step {num} — {name}"
    # 코드 변경 커밋에 사용할 메시지 형식이다.
    CHORE_MSG = "chore({phase}): step {num} output"
    # phase 메타데이터나 output 파일 커밋에 사용할 메시지 형식이다.
    TZ = timezone(timedelta(hours=9))
    # timestamp를 한국 시간(UTC+9)으로 찍기 위한 timezone이다.

    def __init__(
        self,
        phase_dir_name: str,
        *,
        auto_push: bool = False,
        dangerous_bypass_sandbox: bool = False,
    ):
        # __init__은 StepExecutor 객체가 만들어질 때 기본 설정을 준비한다.
        self._root = str(ROOT)
        # subprocess에 넘기기 쉽게 프로젝트 루트 경로를 문자열로 저장한다.
        self._phases_dir = ROOT / "phases"
        # 모든 phase 디렉토리가 모여 있는 phases/ 경로다.
        self._phase_dir = self._phases_dir / phase_dir_name
        # 이번에 실행할 특정 phase 디렉토리 경로다.
        self._phase_dir_name = phase_dir_name
        # 이번 phase 디렉토리 이름을 문자열로 저장한다.
        self._top_index_file = self._phases_dir / "index.json"
        # 전체 phase 목록을 담는 phases/index.json 경로다.
        self._auto_push = auto_push
        # 실행 완료 후 git push까지 할지 저장한다.
        self._dangerous_bypass_sandbox = dangerous_bypass_sandbox
        # codex exec의 sandbox/approval 우회 옵션을 사용할지 저장한다.

        if not self._phase_dir.is_dir():
            # phase 디렉토리가 없으면 더 진행할 수 없다.
            print(f"ERROR: {self._phase_dir} not found")
            # 사용자에게 어떤 경로가 없는지 알려준다.
            sys.exit(1)
            # 1번 종료 코드는 일반적인 실패를 뜻한다.

        self._index_file = self._phase_dir / "index.json"
        # 이번 phase의 step 목록과 상태가 들어 있는 index.json 경로다.
        if not self._index_file.exists():
            # phase index.json이 없으면 실행할 step 목록을 알 수 없다.
            print(f"ERROR: {self._index_file} not found")
            # 사용자에게 누락된 파일을 알려준다.
            sys.exit(1)
            # 실패 코드로 프로그램을 종료한다.

        idx = self._read_json(self._index_file)
        # phase index.json을 읽어 Python dict로 바꾼다.
        self._project = idx.get("project", "project")
        # project 값이 있으면 쓰고, 없으면 기본값 "project"를 쓴다.
        self._phase_name = idx.get("phase", phase_dir_name)
        # phase 이름이 있으면 쓰고, 없으면 디렉토리 이름을 쓴다.
        self._total = len(idx["steps"])
        # 전체 step 개수를 저장한다. 화면 표시와 진행 계산에 쓴다.

    def run(self):
        # run은 전체 실행 순서를 한눈에 보여주는 메인 메서드다.
        self._print_header()
        # 실행 시작 정보를 터미널에 출력한다.
        self._check_blockers()
        # 이전에 error/blocked 상태로 멈춘 step이 있는지 먼저 확인한다.
        self._checkout_branch()
        # 이 phase 전용 git 브랜치로 이동하거나 새로 만든다.
        guardrails = self._load_guardrails()
        # AGENTS.md와 docs/*.md 내용을 모아 Codex에게 줄 규칙 문맥을 만든다.
        self._ensure_created_at()
        # phase index.json에 created_at이 없으면 현재 시각을 추가한다.
        self._execute_all_steps(guardrails)
        # pending 상태인 step들을 순서대로 모두 실행한다.
        self._finalize()
        # 모든 step이 끝나면 phase 완료 처리와 선택적 push를 수행한다.

    # --- timestamps ---
    # 아래 영역은 시간 문자열을 만드는 도우미다.

    def _stamp(self) -> str:
        # 현재 시간을 한국 시간 기준 ISO 비슷한 문자열로 만든다.
        return datetime.now(self.TZ).strftime("%Y-%m-%dT%H:%M:%S%z")

    # --- JSON I/O ---
    # 아래 영역은 JSON 파일 읽기/쓰기 도우미다.

    @staticmethod
    # self를 쓰지 않는 함수라서 staticmethod로 둔다.
    def _read_json(p: Path) -> dict:
        # 파일 p의 내용을 UTF-8로 읽고 JSON dict로 변환한다.
        return json.loads(p.read_text(encoding="utf-8"))

    @staticmethod
    # self를 쓰지 않는 함수라서 staticmethod로 둔다.
    def _write_json(p: Path, data: dict):
        # dict를 사람이 읽기 쉬운 JSON 문자열로 바꿔 파일 p에 저장한다.
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- git ---
    # 아래 영역은 git 명령 실행과 커밋 처리다.

    def _run_git(self, *args) -> subprocess.CompletedProcess:
        # git 뒤에 붙일 인자들을 받아 실제 git 명령을 실행한다.
        cmd = ["git"] + list(args)
        # 예: args가 ("status",)이면 ["git", "status"]가 된다.
        return subprocess.run(cmd, cwd=self._root, capture_output=True, text=True)
        # 프로젝트 루트에서 실행하고, stdout/stderr를 문자열로 받아온다.

    def _checkout_branch(self):
        # 현재 phase용 브랜치로 이동한다. 없으면 새로 만든다.
        branch = f"feat-{self._phase_name}"
        # 브랜치 이름은 feat-<phase-name> 형식이다.

        r = self._run_git("rev-parse", "--abbrev-ref", "HEAD")
        # 현재 체크아웃된 브랜치 이름을 git에게 물어본다.
        if r.returncode != 0:
            # git 명령이 실패하면 git 저장소가 아니거나 git 사용이 불가능한 상황이다.
            print(f"  ERROR: git을 사용할 수 없거나 git repo가 아닙니다.")
            # 사용자에게 git 관련 문제라고 알려준다.
            print(f"  {r.stderr.strip()}")
            # git이 출력한 에러 메시지도 보여준다.
            sys.exit(1)
            # 더 진행해도 커밋을 만들 수 없으므로 종료한다.

        if r.stdout.strip() == branch:
            # 이미 원하는 phase 브랜치에 있으면 checkout할 필요가 없다.
            return

        r = self._run_git("rev-parse", "--verify", branch)
        # 해당 브랜치가 이미 존재하는지 확인한다.
        r = self._run_git("checkout", branch) if r.returncode == 0 else self._run_git("checkout", "-b", branch)
        # 있으면 checkout하고, 없으면 checkout -b로 새 브랜치를 만든다.

        if r.returncode != 0:
            # checkout이 실패하면 보통 커밋되지 않은 충돌 가능 변경사항이 있는 경우다.
            print(f"  ERROR: 브랜치 '{branch}' checkout 실패.")
            # 어떤 브랜치로 이동하다 실패했는지 보여준다.
            print(f"  {r.stderr.strip()}")
            # git의 실제 에러 메시지를 보여준다.
            print(f"  Hint: 변경사항을 stash하거나 commit한 후 다시 시도하세요.")
            # 사용자가 해결할 수 있는 일반적인 방법을 알려준다.
            sys.exit(1)
            # 브랜치가 준비되지 않았으므로 종료한다.

        print(f"  Branch: {branch}")
        # 브랜치 이동 또는 생성이 성공했음을 보여준다.

    def _commit_step(self, step_num: int, step_name: str):
        # 한 step이 끝난 뒤 변경사항을 코드 커밋과 메타데이터 커밋으로 나눠 저장한다.
        output_rel = f"phases/{self._phase_dir_name}/step{step_num}-output.json"
        # Codex 실행 결과가 저장되는 output 파일의 git 상대 경로다.
        index_rel = f"phases/{self._phase_dir_name}/index.json"
        # phase 상태가 저장되는 index 파일의 git 상대 경로다.

        self._run_git("add", "-A")
        # 우선 모든 변경사항을 staging area에 올린다.
        self._run_git("reset", "HEAD", "--", output_rel)
        # output 파일은 코드 커밋에서 빼기 위해 staging에서 내린다.
        self._run_git("reset", "HEAD", "--", index_rel)
        # phase index도 코드 커밋에서 빼기 위해 staging에서 내린다.

        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            # staging된 코드 변경이 하나라도 있으면 코드 커밋을 만든다.
            msg = self.FEAT_MSG.format(phase=self._phase_name, num=step_num, name=step_name)
            # conventional commit 형식의 메시지를 만든다.
            r = self._run_git("commit", "-m", msg)
            # staged 변경사항을 실제 git 커밋으로 저장한다.
            if r.returncode == 0:
                # 커밋 성공이면 메시지를 출력한다.
                print(f"  Commit: {msg}")
            else:
                # 커밋 실패여도 즉시 종료하지 않고 경고만 남긴다.
                print(f"  WARN: 코드 커밋 실패: {r.stderr.strip()}")

        self._run_git("add", "-A")
        # 이제 output/index를 포함한 남은 변경사항을 모두 staging한다.
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            # 남은 staged 변경이 있으면 housekeeping 커밋을 만든다.
            msg = self.CHORE_MSG.format(phase=self._phase_name, num=step_num)
            # 메타데이터용 커밋 메시지를 만든다.
            r = self._run_git("commit", "-m", msg)
            # 남은 변경사항을 커밋한다.
            if r.returncode != 0:
                # housekeeping 커밋 실패도 경고로만 알린다.
                print(f"  WARN: housekeeping 커밋 실패: {r.stderr.strip()}")

    # --- top-level index ---
    # 아래 영역은 phases/index.json의 phase 상태를 업데이트한다.

    def _update_top_index(self, status: str):
        # 전체 phase 목록에서 이번 phase의 상태를 바꾼다.
        if not self._top_index_file.exists():
            # top-level index가 없으면 업데이트할 대상이 없으므로 조용히 끝낸다.
            return
        top = self._read_json(self._top_index_file)
        # phases/index.json을 읽는다.
        ts = self._stamp()
        # 상태 변경 시각을 한 번 만든다.
        for phase in top.get("phases", []):
            # 전체 phase 목록을 하나씩 확인한다.
            if phase.get("dir") == self._phase_dir_name:
                # 이번에 실행 중인 phase 항목을 찾았다.
                phase["status"] = status
                # 해당 phase의 status 값을 새 상태로 바꾼다.
                ts_key = {"completed": "completed_at", "error": "failed_at", "blocked": "blocked_at"}.get(status)
                # 상태에 맞는 timestamp 필드 이름을 고른다.
                if ts_key:
                    # completed/error/blocked처럼 timestamp가 필요한 상태라면 기록한다.
                    phase[ts_key] = ts
                break
                # 원하는 phase를 찾았으므로 더 반복할 필요가 없다.
        self._write_json(self._top_index_file, top)
        # 수정된 전체 phase index를 다시 저장한다.

    # --- guardrails & context ---
    # 아래 영역은 Codex에게 넘길 규칙과 이전 step 요약을 만든다.

    def _load_guardrails(self) -> str:
        # AGENTS.md와 docs/*.md 내용을 합쳐 Codex 실행 prompt에 넣을 텍스트를 만든다.
        sections = []
        # 여러 문서 내용을 순서대로 담을 리스트다.
        agents_md = ROOT / "AGENTS.md"
        # 프로젝트 규칙 파일 경로다.
        if agents_md.exists():
            # AGENTS.md가 있으면 그 내용을 가장 먼저 포함한다.
            sections.append(f"## 프로젝트 규칙 (AGENTS.md)\n\n{agents_md.read_text()}")
        docs_dir = ROOT / "docs"
        # 프로젝트 문서들이 들어 있는 docs/ 경로다.
        if docs_dir.is_dir():
            # docs/가 실제 디렉토리일 때만 내부 문서를 읽는다.
            for doc in sorted(docs_dir.glob("*.md")):
                # docs/ 안의 모든 Markdown 파일을 이름순으로 하나씩 읽는다.
                sections.append(f"## {doc.stem}\n\n{doc.read_text()}")
                # 문서 제목과 내용을 하나의 section 문자열로 추가한다.
        return "\n\n---\n\n".join(sections) if sections else ""
        # section이 있으면 --- 구분선으로 합치고, 없으면 빈 문자열을 반환한다.

    @staticmethod
    # self를 쓰지 않으므로 staticmethod로 둔다.
    def _build_step_context(index: dict) -> str:
        # 이미 완료된 step들의 summary를 다음 Codex 실행에 참고 문맥으로 제공한다.
        lines = [
            # 완료된 step 하나를 "- Step N (name): summary" 한 줄로 만든다.
            f"- Step {s['step']} ({s['name']}): {s['summary']}"
            for s in index["steps"]
            # 전체 step 중에서
            if s["status"] == "completed" and s.get("summary")
            # completed 상태이고 summary가 있는 것만 고른다.
        ]
        if not lines:
            # 아직 완료된 step 요약이 없으면 추가 문맥도 없다.
            return ""
        return "## 이전 Step 산출물\n\n" + "\n".join(lines) + "\n\n"
        # 완료 요약들을 Markdown 섹션으로 만들어 반환한다.

    def _build_preamble(self, guardrails: str, step_context: str,
                        prev_error: Optional[str] = None) -> str:
        # Codex에게 실제 step 파일 앞에 붙여줄 공통 지시문을 만든다.
        commit_example = self.FEAT_MSG.format(
            # Codex에게 어떤 커밋 메시지 형식을 써야 하는지 예시를 보여주기 위한 값이다.
            phase=self._phase_name, num="N", name="<step-name>"
        )
        retry_section = ""
        # 이전 실패가 없으면 재시도 안내 섹션은 비워 둔다.
        if prev_error:
            # 이전 실패 메시지가 있으면 이번 시도 prompt에 반드시 포함한다.
            retry_section = (
                f"\n## ⚠ 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라\n\n"
                f"{prev_error}\n\n---\n\n"
            )
        return (
            # 여기부터는 Codex exec에 전달될 긴 Markdown prompt다.
            f"당신은 {self._project} 프로젝트의 개발자입니다. 아래 step을 수행하세요.\n\n"
            f"{guardrails}\n\n---\n\n"
            f"{step_context}{retry_section}"
            f"## 작업 규칙\n\n"
            f"1. 이전 step에서 작성된 코드를 확인하고 일관성을 유지하라.\n"
            f"2. 이 step에 명시된 작업만 수행하라. 추가 기능이나 파일을 만들지 마라.\n"
            f"3. 기존 테스트를 깨뜨리지 마라.\n"
            f"4. AC(Acceptance Criteria) 검증을 직접 실행하라.\n"
            f"5. /phases/{self._phase_dir_name}/index.json의 해당 step status를 업데이트하라:\n"
            f"   - AC 통과 → \"completed\" + \"summary\" 필드에 이 step의 산출물을 한 줄로 요약\n"
            f"   - {self.MAX_RETRIES}회 수정 시도 후에도 실패 → \"error\" + \"error_message\" 기록\n"
            f"   - 사용자 개입이 필요한 경우 (API 키, 인증, 수동 설정 등) → \"blocked\" + \"blocked_reason\" 기록 후 즉시 중단\n"
            f"6. 모든 변경사항을 커밋하라:\n"
            f"   {commit_example}\n\n---\n\n"
        )
        # 완성된 preamble 문자열을 반환한다.

    # --- Codex 호출 ---
    # 아래 영역은 실제로 codex exec를 실행하고 결과를 파일로 저장한다.

    def _invoke_codex(self, step: dict, preamble: str) -> dict:
        # 한 step에 대해 codex exec를 한 번 호출한다.
        step_num, step_name = step["step"], step["name"]
        # step 번호와 이름을 꺼내서 자주 쓰기 쉽게 변수로 둔다.
        step_file = self._phase_dir / f"step{step_num}.md"
        # Codex에게 줄 실제 작업 지시 파일 경로다.

        if not step_file.exists():
            # stepN.md 파일이 없으면 Codex에게 시킬 작업이 없다.
            print(f"  ERROR: {step_file} not found")
            # 어떤 step 파일이 빠졌는지 알려준다.
            sys.exit(1)
            # 실행을 멈춘다.

        prompt = preamble + step_file.read_text()
        # 공통 규칙 preamble과 step 파일 내용을 이어 붙여 전체 prompt를 만든다.
        cmd = ["codex", "exec"]
        # 실행할 기본 명령은 codex exec다.
        if self._dangerous_bypass_sandbox:
            # 사용자가 위험한 우회 옵션을 켰다면 codex exec에도 넘긴다.
            cmd.append("--dangerously-bypass-approvals-and-sandbox")
        cmd.extend(["--json", prompt])
        # Codex에게 JSON 이벤트 출력 모드와 prompt를 전달한다.

        env = os.environ.copy()
        # 현재 프로세스의 환경변수를 복사한다.
        env["HARNESS_EXECUTION"] = "1"
        # 하위 Codex 실행이 "Harness 안에서 실행 중"임을 알 수 있게 표시한다.

        result = subprocess.run(
            # 외부 명령을 실행하고 끝날 때까지 기다린다.
            cmd,
            # 위에서 만든 codex exec 명령이다.
            cwd=self._root, capture_output=True, text=True, timeout=1800, env=env,
            # 프로젝트 루트에서 실행하고, 출력은 문자열로 받고, 최대 30분만 기다린다.
        )

        if result.returncode != 0:
            # Codex 명령이 0이 아닌 종료 코드를 내면 비정상 종료다.
            print(f"\n  WARN: Codex가 비정상 종료됨 (code {result.returncode})")
            # 종료 코드를 사용자에게 보여준다.
            if result.stderr:
                # stderr가 있으면 앞부분만 잘라 보여준다.
                print(f"  stderr: {result.stderr[:500]}")

        output = {
            # step 실행 결과를 JSON으로 저장하기 위한 dict다.
            "step": step_num, "name": step_name,
            # 어떤 step인지 저장한다.
            "exitCode": result.returncode,
            # codex exec의 종료 코드를 저장한다.
            "stdout": result.stdout, "stderr": result.stderr,
            # codex exec의 표준 출력과 표준 에러를 저장한다.
        }
        out_path = self._phase_dir / f"step{step_num}-output.json"
        # 실행 결과를 저장할 파일 경로다.
        with open(out_path, "w") as f:
            # output 파일을 쓰기 모드로 연다.
            json.dump(output, f, indent=2, ensure_ascii=False)
            # 실행 결과 dict를 보기 좋은 JSON으로 저장한다.

        return output
        # 호출한 쪽에서도 결과를 쓸 수 있게 output dict를 반환한다.

    # --- 헤더 & 검증 ---
    # 아래 영역은 실행 전후 상태를 확인하고 사용자에게 표시한다.

    def _print_header(self):
        # 실행 시작 시 보기 좋은 머리말을 출력한다.
        print(f"\n{'='*60}")
        # 구분선을 출력한다.
        print(f"  Harness Step Executor")
        # 도구 이름을 출력한다.
        print(f"  Phase: {self._phase_name} | Steps: {self._total}")
        # 실행할 phase 이름과 step 개수를 출력한다.
        if self._auto_push:
            # --push 옵션이 켜져 있으면 사용자에게 알린다.
            print(f"  Auto-push: enabled")
        if self._dangerous_bypass_sandbox:
            # sandbox 우회 옵션이 켜져 있으면 사용자에게 알린다.
            print(f"  Sandbox bypass: enabled")
        print(f"{'='*60}")
        # 마지막 구분선을 출력한다.

    def _check_blockers(self):
        # 이전 실행에서 error 또는 blocked로 멈춘 step이 있는지 확인한다.
        index = self._read_json(self._index_file)
        # phase index를 읽는다.
        for s in reversed(index["steps"]):
            # 뒤쪽 step부터 확인한다. 가장 최근에 진행된 step을 빨리 찾기 위해서다.
            if s["status"] == "error":
                # error 상태 step이 있으면 사용자가 상태를 reset하기 전까지 진행하지 않는다.
                print(f"\n  ✗ Step {s['step']} ({s['name']}) failed.")
                # 실패한 step 번호와 이름을 출력한다.
                print(f"  Error: {s.get('error_message', 'unknown')}")
                # 저장된 에러 메시지를 출력한다.
                print(f"  Fix and reset status to 'pending' to retry.")
                # 다시 실행하려면 pending으로 되돌려야 한다고 안내한다.
                sys.exit(1)
                # 실패 코드로 종료한다.
            if s["status"] == "blocked":
                # blocked 상태 step이 있으면 사용자 개입이 필요하므로 진행하지 않는다.
                print(f"\n  ⏸ Step {s['step']} ({s['name']}) blocked.")
                # 막힌 step 번호와 이름을 출력한다.
                print(f"  Reason: {s.get('blocked_reason', 'unknown')}")
                # 막힌 이유를 출력한다.
                print(f"  Resolve and reset status to 'pending' to retry.")
                # 문제를 해결한 뒤 pending으로 바꾸라고 안내한다.
                sys.exit(2)
                # 2번 종료 코드는 blocked 같은 특수 중단을 뜻한다.
            if s["status"] != "pending":
                # completed 같은 진행 완료 상태를 만나면 그 앞은 이미 괜찮다고 보고 멈춘다.
                break

    def _ensure_created_at(self):
        # phase index에 created_at이 없으면 추가한다.
        index = self._read_json(self._index_file)
        # phase index를 읽는다.
        if "created_at" not in index:
            # created_at 필드가 아직 없을 때만 기록한다.
            index["created_at"] = self._stamp()
            # 현재 시각을 created_at으로 넣는다.
            self._write_json(self._index_file, index)
            # 수정된 index를 저장한다.

    # --- 실행 루프 ---
    # 아래 영역은 pending step을 찾고, 실행하고, 재시도하는 핵심 루프다.

    def _execute_single_step(self, step: dict, guardrails: str) -> bool:
        # 단일 step 하나를 실행한다. 실패하면 최대 MAX_RETRIES까지 다시 시도한다.
        """단일 step 실행 (재시도 포함). 완료되면 True, 실패/차단이면 False."""
        step_num, step_name = step["step"], step["name"]
        # step 번호와 이름을 꺼낸다.
        done = sum(1 for s in self._read_json(self._index_file)["steps"] if s["status"] == "completed")
        # 현재까지 completed 상태인 step 개수를 센다.
        prev_error = None
        # 첫 시도에는 이전 에러가 없으므로 None으로 시작한다.

        for attempt in range(1, self.MAX_RETRIES + 1):
            # attempt는 1부터 MAX_RETRIES까지 돈다.
            index = self._read_json(self._index_file)
            # 매 시도마다 최신 index를 다시 읽는다.
            step_context = self._build_step_context(index)
            # 이전 completed step들의 summary를 prompt 문맥으로 만든다.
            preamble = self._build_preamble(guardrails, step_context, prev_error)
            # guardrails, 이전 step 요약, 이전 에러를 합쳐 Codex prompt 앞부분을 만든다.

            tag = f"Step {step_num}/{self._total - 1} ({done} done): {step_name}"
            # 진행 표시기에 보여줄 기본 문구다.
            if attempt > 1:
                # 두 번째 시도부터는 retry 표시를 붙인다.
                tag += f" [retry {attempt}/{self.MAX_RETRIES}]"

            with progress_indicator(tag) as pi:
                # Codex 실행 중에는 스피너와 경과 시간이 표시된다.
                self._invoke_codex(step, preamble)
                # 실제 codex exec를 호출한다.
                elapsed = int(pi.elapsed)
                # with 블록 안에서는 아직 finally 전이라 보통 0에 가깝게 읽힐 수 있다.

            index = self._read_json(self._index_file)
            # Codex가 index.json 상태를 바꿨을 수 있으므로 다시 읽는다.
            status = next((s.get("status", "pending") for s in index["steps"] if s["step"] == step_num), "pending")
            # 이번 step의 최신 status를 찾는다. 못 찾으면 pending으로 본다.
            ts = self._stamp()
            # 상태 전환에 찍을 현재 시각이다.

            if status == "completed":
                # Codex가 step을 completed로 표시했다면 성공 처리한다.
                for s in index["steps"]:
                    # index 안의 step들을 순회한다.
                    if s["step"] == step_num:
                        # 이번 step 항목을 찾았다.
                        s["completed_at"] = ts
                        # 완료 시각을 기록한다.
                self._write_json(self._index_file, index)
                # 완료 시각이 들어간 index를 저장한다.
                self._commit_step(step_num, step_name)
                # 코드 변경과 메타데이터 변경을 커밋한다.
                print(f"  ✓ Step {step_num}: {step_name} [{elapsed}s]")
                # 사용자에게 성공 메시지를 출력한다.
                return True
                # 이 step은 끝났다는 뜻으로 True를 반환한다.

            if status == "blocked":
                # Codex가 사용자 개입 필요 상태로 표시했다면 즉시 중단한다.
                for s in index["steps"]:
                    # index 안의 step들을 순회한다.
                    if s["step"] == step_num:
                        # 이번 step 항목을 찾았다.
                        s["blocked_at"] = ts
                        # blocked 시각을 기록한다.
                self._write_json(self._index_file, index)
                # blocked 시각이 들어간 index를 저장한다.
                reason = next((s.get("blocked_reason", "") for s in index["steps"] if s["step"] == step_num), "")
                # 이번 step의 blocked_reason을 찾아 출력 준비를 한다.
                print(f"  ⏸ Step {step_num}: {step_name} blocked [{elapsed}s]")
                # blocked 상태를 사용자에게 알린다.
                print(f"    Reason: {reason}")
                # 왜 blocked인지 출력한다.
                self._update_top_index("blocked")
                # phases/index.json에도 blocked 상태를 반영한다.
                sys.exit(2)
                # 사용자 개입이 필요하므로 프로그램을 종료한다.

            err_msg = next(
                # completed도 blocked도 아니면 실패로 보고 에러 메시지를 찾는다.
                (s.get("error_message", "Step did not update status") for s in index["steps"] if s["step"] == step_num),
                # 해당 step에 error_message가 없으면 "상태를 업데이트하지 않았다"는 기본 메시지를 쓴다.
                "Step did not update status",
                # step 자체를 못 찾은 경우에도 같은 기본 메시지를 쓴다.
            )

            if attempt < self.MAX_RETRIES:
                # 아직 재시도 기회가 남아 있으면 step 상태를 pending으로 되돌리고 다시 돈다.
                for s in index["steps"]:
                    # index 안의 step들을 순회한다.
                    if s["step"] == step_num:
                        # 이번 step 항목을 찾았다.
                        s["status"] = "pending"
                        # 다음 시도를 위해 상태를 pending으로 되돌린다.
                        s.pop("error_message", None)
                        # 이전 error_message는 지운다. 다음 실패 때 새로 쓸 수 있게 하기 위해서다.
                self._write_json(self._index_file, index)
                # pending으로 되돌린 index를 저장한다.
                prev_error = err_msg
                # 다음 Codex prompt에 이번 실패 메시지를 넣기 위해 저장한다.
                print(f"  ↻ Step {step_num}: retry {attempt}/{self.MAX_RETRIES} — {err_msg}")
                # 사용자에게 재시도 예정임을 알린다.
            else:
                # 마지막 시도까지 실패했다면 최종 error 상태로 기록하고 종료한다.
                for s in index["steps"]:
                    # index 안의 step들을 순회한다.
                    if s["step"] == step_num:
                        # 이번 step 항목을 찾았다.
                        s["status"] = "error"
                        # 상태를 error로 확정한다.
                        s["error_message"] = f"[{self.MAX_RETRIES}회 시도 후 실패] {err_msg}"
                        # 몇 번 시도 후 실패했는지 포함한 에러 메시지를 저장한다.
                        s["failed_at"] = ts
                        # 실패 시각을 저장한다.
                self._write_json(self._index_file, index)
                # error 상태가 들어간 index를 저장한다.
                self._commit_step(step_num, step_name)
                # 실패 상태와 관련 변경도 커밋한다.
                print(f"  ✗ Step {step_num}: {step_name} failed after {self.MAX_RETRIES} attempts [{elapsed}s]")
                # 최종 실패 메시지를 출력한다.
                print(f"    Error: {err_msg}")
                # 실패 원인을 출력한다.
                self._update_top_index("error")
                # phases/index.json에도 error 상태를 반영한다.
                sys.exit(1)
                # 실패 코드로 프로그램을 종료한다.

        return False  # unreachable
        # for 루프 안에서 성공/중단/실패가 모두 처리되므로 실제로는 여기까지 오지 않는다.

    def _execute_all_steps(self, guardrails: str):
        # pending 상태인 step을 하나씩 찾아 모두 실행한다.
        while True:
            # pending step이 없어질 때까지 계속 반복한다.
            index = self._read_json(self._index_file)
            # 매 반복마다 최신 index를 읽는다.
            pending = next((s for s in index["steps"] if s["status"] == "pending"), None)
            # 첫 번째 pending step을 찾는다. 없으면 None이다.
            if pending is None:
                # 더 실행할 pending step이 없으면 모든 step이 끝난 것이다.
                print("\n  All steps completed!")
                # 완료 메시지를 출력한다.
                return
                # 실행 루프를 끝낸다.

            step_num = pending["step"]
            # 이번에 실행할 step 번호다.
            for s in index["steps"]:
                # started_at을 기록하기 위해 index의 step들을 순회한다.
                if s["step"] == step_num and "started_at" not in s:
                    # 이번 step이고 아직 시작 시각이 없다면
                    s["started_at"] = self._stamp()
                    # 현재 시각을 started_at으로 기록한다.
                    self._write_json(self._index_file, index)
                    # 수정된 index를 저장한다.
                    break
                    # started_at은 한 번만 기록하면 되므로 반복을 멈춘다.

            self._execute_single_step(pending, guardrails)
            # 찾은 pending step 하나를 실행한다. 성공하면 while 루프가 다음 pending을 찾는다.

    def _finalize(self):
        # 모든 step이 끝난 뒤 phase 전체를 완료 처리한다.
        index = self._read_json(self._index_file)
        # phase index를 읽는다.
        index["completed_at"] = self._stamp()
        # phase 전체 완료 시각을 기록한다.
        self._write_json(self._index_file, index)
        # 완료 시각이 들어간 index를 저장한다.
        self._update_top_index("completed")
        # phases/index.json에도 completed 상태를 반영한다.

        self._run_git("add", "-A")
        # 완료 처리로 바뀐 파일들을 staging한다.
        if self._run_git("diff", "--cached", "--quiet").returncode != 0:
            # staging된 변경이 있으면 phase 완료 커밋을 만든다.
            msg = f"chore({self._phase_name}): mark phase completed"
            # 완료 표시용 커밋 메시지다.
            r = self._run_git("commit", "-m", msg)
            # staged 변경사항을 커밋한다.
            if r.returncode == 0:
                # 커밋 성공이면 사용자에게 표시한다.
                print(f"  ✓ {msg}")

        if self._auto_push:
            # --push 옵션이 켜져 있으면 원격 저장소로 브랜치를 push한다.
            branch = f"feat-{self._phase_name}"
            # push할 브랜치 이름이다.
            r = self._run_git("push", "-u", "origin", branch)
            # origin 원격에 현재 phase 브랜치를 push하고 upstream도 설정한다.
            if r.returncode != 0:
                # push가 실패하면 에러를 출력하고 종료한다.
                print(f"\n  ERROR: git push 실패: {r.stderr.strip()}")
                # git push 에러 메시지를 보여준다.
                sys.exit(1)
                # 실패 코드로 종료한다.
            print(f"  ✓ Pushed to origin/{branch}")
            # push 성공 메시지를 출력한다.

        print(f"\n{'='*60}")
        # 완료 구분선을 출력한다.
        print(f"  Phase '{self._phase_name}' completed!")
        # phase 완료 메시지를 출력한다.
        print(f"{'='*60}")
        # 마지막 구분선을 출력한다.


def main():
    # main은 터미널에서 이 파일을 실행했을 때 가장 먼저 호출되는 진입점이다.
    parser = argparse.ArgumentParser(description="Harness Step Executor")
    # 명령행 인자 parser를 만들고 프로그램 설명을 붙인다.
    parser.add_argument("phase_dir", help="Phase directory name (e.g. 0-mvp)")
    # 필수 인자 phase_dir을 받는다. 예: python3 scripts/execute.py 0-mvp
    parser.add_argument("--push", action="store_true", help="Push branch after completion")
    # --push가 있으면 args.push가 True가 된다.
    parser.add_argument(
        # 위험 옵션 인자를 추가한다.
        "--dangerous-bypass-sandbox",
        # 이 옵션 이름으로 CLI에서 받을 수 있다.
        action="store_true",
        # 옵션이 있으면 True, 없으면 False로 만든다.
        help="Pass codex exec --dangerously-bypass-approvals-and-sandbox. Use only for trusted local projects.",
        # --help에 표시될 설명이다.
    )
    args = parser.parse_args()
    # 실제 터미널 인자를 파싱해서 args 객체로 만든다.

    StepExecutor(
        # 파싱한 인자를 StepExecutor에 넘겨 실행 객체를 만든다.
        args.phase_dir,
        # 어떤 phase 디렉토리를 실행할지 전달한다.
        auto_push=args.push,
        # --push 여부를 전달한다.
        dangerous_bypass_sandbox=args.dangerous_bypass_sandbox,
        # sandbox 우회 옵션 여부를 전달한다.
    ).run()
    # 객체를 만든 즉시 run()을 호출해 전체 실행을 시작한다.


if __name__ == "__main__":
    # 이 파일이 import된 것이 아니라 직접 실행된 경우에만 main()을 실행한다.
    main()
    # 터미널 인자를 읽고 StepExecutor를 실행한다.
