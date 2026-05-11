#!/usr/bin/env bash
set -euo pipefail

# TDD Guard wrapper for Codex hooks.
#
# Prefer a project-local install, then the active shell PATH. If TDD Guard is
# not installed yet, do not block the session; print setup guidance instead.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK_DATA="$(cat)"

if [[ -z "$HOOK_DATA" ]]; then
  echo "TDD Guard hook data is empty; skipping direct-run check." >&2
  exit 0
fi

if [[ -x "$ROOT_DIR/node_modules/.bin/tdd-guard" ]]; then
  printf "%s" "$HOOK_DATA" | "$ROOT_DIR/node_modules/.bin/tdd-guard"
  exit $?
fi

if [[ -x "$ROOT_DIR/.venv/bin/tdd-guard" ]]; then
  printf "%s" "$HOOK_DATA" | "$ROOT_DIR/.venv/bin/tdd-guard"
  exit $?
fi

if command -v tdd-guard >/dev/null 2>&1; then
  printf "%s" "$HOOK_DATA" | tdd-guard
  exit $?
fi

cat >&2 <<'EOF'
TDD Guard hook is configured, but the `tdd-guard` CLI is not installed.

Install one of these before relying on enforcement:
  npm install -g tdd-guard
  python -m pip install tdd-guard
EOF

if [[ "${TDD_GUARD_REQUIRED:-0}" == "1" ]]; then
  exit 1
fi

exit 0
