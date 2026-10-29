#!/usr/bin/env bash
# End-to-end smoke test of the Docker stack, through nginx like a browser.
#   docker compose up -d --build && bash scripts/smoke.sh
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
failures=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "ok   - $name"
  else
    echo "FAIL - $name (expected '$expected', got '${actual:0:120}')"
    failures=$((failures + 1))
  fi
}

status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "Waiting for $BASE ..."
for _ in $(seq 1 60); do
  [[ "$(status "$BASE/healthz" || true)" == "200" ]] && break
  sleep 1
done

check "nginx health" "200" "$(status "$BASE/healthz")"
check "page is served" "Sitter Ranking" "$(curl -s "$BASE/")"
check "out-of-area search is empty" '"totalCandidates":0' \
  "$(curl -s "$BASE/api/sitters?lat=23.8103&lng=90.4125&service=boarding")"
check "page sends security headers" "nosniff" "$(curl -s -D - -o /dev/null "$BASE/")"
check "unknown page is a 404" "404" "$(status "$BASE/no-such-page")"
check "ranked sitters through nginx" '"totalCandidates"' \
  "$(curl -s "$BASE/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=3")"
check "page 2 starts at rank 4 (limit 3)" '"rank":4' \
  "$(curl -s "$BASE/api/sitters?lat=48.8566&lng=2.3522&service=dog_walking&limit=3&page=2")"
check "price suggestion" '"median"' \
  "$(curl -s "$BASE/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking")"
check "bad latitude is a 400" "400" "$(status "$BASE/api/sitters?lat=95&lng=2.35&service=dog_walking")"
check "unknown API route is a JSON 404" '"Not found"' "$(curl -s "$BASE/api/nope")"
check "API response carries a request id" "x-request-id" \
  "$(curl -s -D - -o /dev/null "$BASE/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking" | tr 'A-Z' 'a-z')"
# Ask Docker (not the host port, which `npm run dev` may be using): only nginx is published.
published="$(docker compose port api 4000 2>/dev/null || true)"
# Docker prints ":0" (or nothing) for a port that is exposed but not published.
[[ -z "$published" || "$published" == ":0" ]] && published="none"
check "API container publishes no port" "none" "$published"

# The API container stops: nginx answers in the API's JSON error shape, and the
# stack recovers when it is back.
docker compose stop api >/dev/null 2>&1
# Restore the local API if a later assertion command exits unexpectedly.
trap 'docker compose start api >/dev/null 2>&1 || true' EXIT
check "API down: JSON 503 from nginx" '"error":"The API is not reachable' \
  "$(curl -s "$BASE/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking")"
docker compose start api >/dev/null 2>&1
trap - EXIT
for _ in $(seq 1 30); do
  [[ "$(status "$BASE/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking")" == "200" ]] && break
  sleep 1
done
check "API back: requests succeed again" "200" \
  "$(status "$BASE/api/price-suggestion?lat=48.8566&lng=2.3522&service=dog_walking")"

if [[ $failures -gt 0 ]]; then
  echo "smoke: $failures FAILED"
  exit 1
fi
echo "smoke: ALL PASSED"
