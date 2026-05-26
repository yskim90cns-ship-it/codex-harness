#!/usr/bin/env python3
"""Run the repository test suite when its optional pytest dependency exists."""

import importlib.util
import subprocess
import sys


def main() -> int:
    if importlib.util.find_spec("pytest") is None:
        print("codex hook: skipping pytest (pytest not installed)", file=sys.stderr)
        return 0

    return subprocess.run(
        [sys.executable, "-m", "pytest", "scripts/test_execute.py"],
        check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
