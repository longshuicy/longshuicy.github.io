#!/usr/bin/env bash
# Serve the static site locally. Idempotent: does nothing if the port is already up.
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PORT="${SITE_PORT:-4000}"
LOG="$ROOT/.claude/serve.log"

if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "site already at http://localhost:$PORT"
  exit 0
fi

cd "$ROOT"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >"$LOG" 2>&1 &
sleep 0.3
echo "serving $ROOT at http://localhost:$PORT (pid $!)"
