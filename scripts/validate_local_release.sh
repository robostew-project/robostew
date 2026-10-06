#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

PORT=${ROBOSTEW_PORT:-8080}
BASE_URL="http://127.0.0.1:$PORT"
COMPOSE="docker compose --project-name robostew --file compose.yaml"

pass() {
  printf 'PASS: %s\n' "$*"
}

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

json_has() {
  endpoint=$1
  pattern=$2
  curl --silent --fail "$BASE_URL$endpoint" | grep -q "$pattern" || fail "$endpoint missing $pattern"
}

docker info >/dev/null 2>&1 || fail "Docker Desktop is not running"
curl --silent --fail "$BASE_URL/healthz" >/dev/null || fail "control plane health check"
pass "control plane health check"

node --test local/tests/*.test.mjs >/dev/null
pass "model and projection unit tests"

docker compose --file compose.yaml config --quiet
pass "Compose configuration"

unhealthy=$($COMPOSE ps --format json | grep -c '"Health":"unhealthy"' || true)
[ "$unhealthy" -eq 0 ] || fail "unhealthy containers detected"
running=$($COMPOSE ps --status running --services | wc -l | tr -d ' ')
[ "$running" -eq 5 ] || fail "expected 5 running services, found $running"
pass "five Compose services running"

json_has /api/runtime/truth '"state":"running"'
json_has /api/runtime/truth '"state":"stopped"'
json_has /api/fleet '"simulated":true'
json_has /api/workloads '"inert":true'
pass "runtime truth and simulation labels"

public_payload=$(mktemp)
trap 'rm -f "$public_payload"' EXIT
for endpoint in /api/runtime/truth /api/fleet /api/workloads /api/accelerated /api/events /api/summary; do
  curl --silent --fail "$BASE_URL$endpoint" >> "$public_payload"
  printf '\n' >> "$public_payload"
done

host_root_one=$(printf '\057\125\163\145\162\163\057')
host_root_two=$(printf '\057\150\157\155\145\057')
privacy_pattern="(password|authorization|api[_-]?key|private[_-]?key|ssh |$host_root_one|$host_root_two|100\.[0-9]+\.[0-9]+\.[0-9]+)"
if grep -Eiq "$privacy_pattern" "$public_payload"; then
  fail "public API privacy projection"
fi
pass "public API privacy projection"

headers=$(curl --silent --dump-header - --output /dev/null "$BASE_URL/")
printf '%s' "$headers" | grep -qi '^Content-Security-Policy:' || fail "Content-Security-Policy header"
printf '%s' "$headers" | grep -qi '^X-Content-Type-Options: nosniff' || fail "nosniff header"
printf '%s' "$headers" | grep -qi '^X-Frame-Options: DENY' || fail "frame denial header"
pass "browser security headers"

invalid_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --request POST --header 'Content-Type: application/json' --data '{"robots":[]}' "$BASE_URL/api/telemetry/batch")
[ "$invalid_status" = "400" ] || fail "invalid telemetry rejection"
pass "invalid telemetry rejection"

invalid_accelerated=$(curl --silent --output /dev/null --write-out '%{http_code}' --request POST --header 'Content-Type: application/json' --data '{"state":"running"}' "$BASE_URL/api/accelerated/snapshot")
[ "$invalid_accelerated" = "400" ] || fail "invalid accelerated snapshot rejection"
stale_payload='{"state":"running","observedAt":"2000-01-01T00:00:00.000Z","recordEvent":false,"summary":{"gpuNodes":1},"workloads":[{"id":"safe-workload","state":"running","pipelineStage":"evaluate","requestedGpus":1,"node":"private-node-name","credential":"must-not-cross-api"}]}'
curl --silent --fail --request POST --header 'Content-Type: application/json' --data "$stale_payload" "$BASE_URL/api/accelerated/snapshot" >/dev/null
json_has /api/accelerated '"state":"unreachable"'
accelerated_payload=$(curl --silent --fail "$BASE_URL/api/accelerated")
printf '%s' "$accelerated_payload" | grep -q 'private-node-name\|must-not-cross-api' && fail "accelerated snapshot privacy projection"
pass "accelerated snapshot rejection, privacy projection, and stale-state behavior"

demo_result=$(./robostew demo)
printf '%s' "$demo_result" | grep -q '"status":"completed"' || fail "deterministic demonstration completion"
printf '%s' "$demo_result" | grep -q '"requestedGpus":3' || fail "accelerated fixture ingestion"
events=$(curl --silent --fail "$BASE_URL/api/events")
for stage in baseline attention recovery stable; do
  printf '%s' "$events" | grep -q "\"stage\":\"$stage\"" || fail "missing demonstration stage $stage"
done
json_has /api/summary '"robots":5'
json_has /api/summary '"runningWorkloads":2'
json_has /api/accelerated '"source":"fixture"'
json_has /api/accelerated '"requestedGpus":3'
pass "deterministic four-stage scenario, accelerated fixture, and stable result"

binding=$(docker inspect robostew-control-plane-1 --format '{{(index (index .HostConfig.PortBindings "8080/tcp") 0).HostIp}}')
[ "$binding" = "127.0.0.1" ] || fail "dashboard is not bound to loopback"
privileged=$(docker inspect robostew-control-plane-1 --format '{{.HostConfig.Privileged}}')
[ "$privileged" = "false" ] || fail "control plane is privileged"
user=$(docker inspect robostew-control-plane-1 --format '{{.Config.User}}')
[ "$user" = "node" ] || fail "control plane is not running as the node user"
binds=$(docker inspect robostew-control-plane-1 --format '{{json .HostConfig.Binds}}')
[ "$binds" = "null" ] || fail "control plane has host bind mounts"
pass "loopback, unprivileged user, and no host bind mounts"

printf 'All local release functional and security checks passed.\n'
