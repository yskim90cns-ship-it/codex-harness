#!/usr/bin/env bash
set -euo pipefail

# TDD Guard wrapper for Codex hooks.
#
# Prefer a project-local install, then the active shell PATH. If TDD Guard is
# not installed yet, do not block the session; print setup guidance instead.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -x "$ROOT_DIR/node_modules/.bin/tdd-guard" ]]; then
  exec "$ROOT_DIR/node_modules/.bin/tdd-guard"
fi

if [[ -x "$ROOT_DIR/.venv/bin/tdd-guard" ]]; then
  exec "$ROOT_DIR/.venv/bin/tdd-guard"
fi

if command -v tdd-guard >/dev/null 2>&1; then
  exec tdd-guard
fi

cat >&2 <<'EOF'
TDD Guard hook is configured, but the `tdd-guard` CLI is not installed.

Install one of these before relying on enforcement:
  npm install -g tdd-guard
  python -m pip install tdd-guard
EOF

exit 0
