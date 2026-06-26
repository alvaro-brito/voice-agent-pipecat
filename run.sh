#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUNTIME_DIR="$ROOT_DIR/.runtime"

BACKEND_PORT=8009
FRONTEND_PORT=3006

BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
BACKEND_LOG="$RUNTIME_DIR/backend.log"
FRONTEND_LOG="$RUNTIME_DIR/frontend.log"

mkdir -p "$RUNTIME_DIR"
touch "$BACKEND_LOG" "$FRONTEND_LOG"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

cleanup_stale_pidfile() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -z "$pid" ]] || ! is_pid_running "$pid"; then
      rm -f "$pid_file"
    fi
  fi
}

start_backend() {
  cleanup_stale_pidfile "$BACKEND_PID_FILE"

  if [[ -f "$BACKEND_PID_FILE" ]]; then
    echo "Backend is already running with PID $(cat "$BACKEND_PID_FILE")."
    return
  fi

  if port_in_use "$BACKEND_PORT"; then
    echo "Port $BACKEND_PORT is already in use. Stop the current process before starting the backend."
    exit 1
  fi

  echo "Starting backend on http://localhost:$BACKEND_PORT ..."
  (
    cd "$BACKEND_DIR"
    nohup uv run python main.py >"$BACKEND_LOG" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
  )
}

start_frontend() {
  cleanup_stale_pidfile "$FRONTEND_PID_FILE"

  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    echo "Frontend is already running with PID $(cat "$FRONTEND_PID_FILE")."
    return
  fi

  if port_in_use "$FRONTEND_PORT"; then
    echo "Port $FRONTEND_PORT is already in use. Stop the current process before starting the frontend."
    exit 1
  fi

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
  fi

  echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host 0.0.0.0 >"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )
}

if ! command_exists uv; then
  echo "Command 'uv' was not found."
  exit 1
fi

if ! command_exists npm; then
  echo "Command 'npm' was not found."
  exit 1
fi

if ! command_exists lsof; then
  echo "Command 'lsof' was not found."
  exit 1
fi

start_backend
start_frontend

sleep 2

echo
echo "Services started."
echo "- Backend:  http://localhost:$BACKEND_PORT"
echo "- Frontend: http://localhost:$FRONTEND_PORT"
echo "- Backend log:  $BACKEND_LOG"
echo "- Frontend log: $FRONTEND_LOG"
echo "- Runtime dir:  $RUNTIME_DIR"
