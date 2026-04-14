#!/usr/bin/env bash
# Resilient e2e runner for @terseware/ui.
#
# 1. Kills any process squatting on :4200 (previous crashed dev servers, etc.)
# 2. Boots `nx run ui-tests:serve` in the background
# 3. Waits for http://localhost:4200 to respond
# 4. Runs `nx e2e ui-tests-e2e` (Playwright reuses the running server via
#    `reuseExistingServer: true` in playwright.config.ts)
# 5. Cleans up the dev server — on success, on failure, or on Ctrl+C
#
# Extra arguments are forwarded to `nx e2e ui-tests-e2e`, so things like
# `nx e2e ui -- --project=chromium --grep menu` work.
#
# Passing `--ui` opens Playwright UI mode. UI mode has its own integrated
# time-travel debugger — PWDEBUG=1 is intentionally NOT set because it spawns
# a separate Inspector window per test on top of the UI. The trap ensures the
# dev server is killed once the UI window closes.

set -u

PORT=4200
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_DIR="$WORKSPACE_ROOT/dist/.playwright/tests/ui-tests-e2e"
SERVE_LOG="$LOG_DIR/serve.log"
SERVER_PID=""

mkdir -p "$LOG_DIR"

log() { printf '\033[36m[e2e]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[e2e]\033[0m %s\n' "$*" >&2; }

kill_port() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  fi
}

cleanup() {
  local exit_code=$?
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    log "stopping dev server (pid $SERVER_PID)..."
    # Kill the whole process group so grandchild Angular workers die too
    kill -TERM "-$SERVER_PID" 2>/dev/null || kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  kill_port
  exit $exit_code
}
trap cleanup EXIT INT TERM

log "freeing port $PORT..."
kill_port

log "starting ui-tests dev server (log: $SERVE_LOG)..."
(
  cd "$WORKSPACE_ROOT"
  exec pnpm exec nx run ui-tests:serve > "$SERVE_LOG" 2>&1
) &
SERVER_PID=$!

log "waiting for http://localhost:$PORT ..."
READY=0
for _ in $(seq 1 120); do
  if curl -sf "http://localhost:$PORT" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    warn "dev server exited prematurely. Log tail:"
    tail -n 60 "$SERVE_LOG" >&2 || true
    exit 1
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  warn "dev server did not become ready within 120s. Log tail:"
  tail -n 60 "$SERVE_LOG" >&2 || true
  exit 1
fi

log "dev server ready — running playwright..."
(
  cd "$WORKSPACE_ROOT"
  pnpm exec nx e2e ui-tests-e2e "$@"
)
