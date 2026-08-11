#!/usr/bin/env bash
# Starts an isolated backend + frontend for this repo, runs the Playwright
# suite against them, then tears both servers down. Uses dedicated ports
# (2022/5180) so it never touches dev servers you may have running elsewhere
# (e.g. another worktree on the default 2021/5173).
set -uo pipefail
set -m # each backgrounded job gets its own process group, so we can kill it as a unit (portable alternative to setsid, which isn't available on macOS)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$HOME/workspace/donetick-core"

BACKEND_PORT=2022
FRONTEND_PORT=5180
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

LOG_DIR="$SCRIPT_DIR/.e2e-run"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "--- Stopping e2e servers ---"
  [[ -n "$FRONTEND_PID" ]] && kill -TERM -"$FRONTEND_PID" 2>/dev/null
  [[ -n "$BACKEND_PID" ]] && kill -TERM -"$BACKEND_PID" 2>/dev/null
  sleep 1
  [[ -n "$FRONTEND_PID" ]] && kill -KILL -"$FRONTEND_PID" 2>/dev/null
  [[ -n "$BACKEND_PID" ]] && kill -KILL -"$BACKEND_PID" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Port $port in use by leftover process(es) $pids — killing."
    kill -TERM $pids 2>/dev/null
    sleep 1
    kill -KILL $pids 2>/dev/null || true
  fi
}

wait_for_backend() {
  for ((i = 1; i <= 40; i++)); do
    if curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND_URL/api/v1/auth/login" \
        -H 'Content-Type: application/json' -d '{}' 2>/dev/null | grep -qE '^[0-9]+$'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_frontend() {
  for ((i = 1; i <= 40; i++)); do
    if curl -sf -o /dev/null "$FRONTEND_URL" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

echo "--- Starting backend on :$BACKEND_PORT (log: $LOG_DIR/backend.log) ---"
(
  cd "$BACKEND_DIR"
  exec env \
    DT_NAME=e2e-frontend-repo \
    DT_IS_DONE_TICK_DOT_COM=false \
    DT_IS_USER_CREATION_DISABLED=false \
    DT_DATABASE_TYPE=sqlite \
    DT_DATABASE_MIGRATION=true \
    DT_JWT_SECRET=e2e_test_secret_change_this_32chars \
    DT_JWT_SESSION_TIME=168h \
    DT_JWT_MAX_REFRESH=168h \
    DT_SERVER_PORT="$BACKEND_PORT" \
    DT_SERVER_READ_TIMEOUT=10s \
    DT_SERVER_WRITE_TIMEOUT=10s \
    DT_SERVER_RATE_PERIOD=60s \
    DT_SERVER_RATE_LIMIT=300 \
    DT_SERVER_CORS_ALLOW_ORIGINS="$FRONTEND_URL" \
    DT_SERVER_SERVE_FRONTEND=false \
    go run .
) > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "--- Starting frontend on :$FRONTEND_PORT (log: $LOG_DIR/frontend.log) ---"
(
  cd "$FRONTEND_DIR"
  exec env VITE_APP_API_URL="$BACKEND_URL" npx vite --port "$FRONTEND_PORT" --strictPort
) > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "Waiting for backend..."
if ! wait_for_backend; then
  echo "Backend did not become ready. See $LOG_DIR/backend.log" >&2
  exit 1
fi

echo "Waiting for frontend..."
if ! wait_for_frontend; then
  echo "Frontend did not become ready. See $LOG_DIR/frontend.log" >&2
  exit 1
fi

echo "--- Running Playwright tests ---"
cd "$SCRIPT_DIR"
E2E_FRONTEND_URL="$FRONTEND_URL" E2E_API_URL="$BACKEND_URL" npx playwright test "$@"
TEST_EXIT=$?

exit $TEST_EXIT
