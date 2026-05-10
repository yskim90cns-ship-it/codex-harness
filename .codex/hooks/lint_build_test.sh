#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

has_npm_script() {
  local script_name="$1"

  [[ -f package.json ]] || return 1
  node -e '
    const fs = require("fs");
    const script = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    process.exit(pkg.scripts && pkg.scripts[script] ? 0 : 1);
  ' "$script_name"
}

run_or_skip_npm() {
  local script_name="$1"

  if has_npm_script "$script_name"; then
    echo "codex hook: npm run $script_name" >&2
    npm run "$script_name"
  else
    echo "codex hook: skipping npm run $script_name (script not found)" >&2
  fi
}

run_python_tests() {
  if [[ -x .venv/bin/python && -d scripts ]]; then
    echo "codex hook: .venv/bin/python -m pytest scripts/test_execute.py" >&2
    .venv/bin/python -m pytest scripts/test_execute.py
  elif command -v pytest >/dev/null 2>&1 && [[ -d scripts ]]; then
    echo "codex hook: pytest scripts/test_execute.py" >&2
    pytest scripts/test_execute.py
  else
    echo "codex hook: skipping pytest (pytest or tests not found)" >&2
  fi
}

run_or_skip_npm lint
run_or_skip_npm build

if has_npm_script test; then
  echo "codex hook: npm run test" >&2
  npm run test
else
  echo "codex hook: skipping npm run test (script not found)" >&2
fi

run_python_tests
