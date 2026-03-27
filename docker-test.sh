#!/usr/bin/env bash
set -euo pipefail

# End-to-end Docker validation for FinVibe.
# Runs stack bring-up, DB init, API/security tests, and persistence check.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "docker-compose.yml" ]]; then
  echo "[ERROR] docker-compose.yml not found. Run this script from repository root."
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "[ERROR] Docker Compose is not available. Install Docker Desktop/Compose first."
  exit 1
fi

BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-80}"
BASE_URL="http://localhost:${BACKEND_PORT}"

declare -a CHECKS=()
declare -a FAILURES=()

pass() {
  CHECKS+=("PASS | $1")
}

fail() {
  CHECKS+=("FAIL | $1")
  FAILURES+=("$1")
}

log() {
  echo "[INFO] $1"
}

status_of() {
  awk -F: '/HTTP_STATUS/ {print $2}' | tail -n1
}

body_of() {
  sed '/HTTP_STATUS:/d'
}

request() {
  local method="$1"
  local url="$2"
  local auth="${3:-}"
  local data="${4:-}"

  if [[ -n "$auth" && -n "$data" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $auth" \
      -d "$data" \
      -w "\nHTTP_STATUS:%{http_code}\n"
  elif [[ -n "$auth" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Authorization: Bearer $auth" \
      -w "\nHTTP_STATUS:%{http_code}\n"
  elif [[ -n "$data" ]]; then
    curl -sS -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data" \
      -w "\nHTTP_STATUS:%{http_code}\n"
  else
    curl -sS -X "$method" "$url" \
      -w "\nHTTP_STATUS:%{http_code}\n"
  fi
}

json_get() {
  local json="$1"
  local path="$2"
  node -e 'const obj=JSON.parse(process.argv[1]); const parts=process.argv[2].split("."); let v=obj; for (const p of parts) v=v?.[p]; process.stdout.write(v === undefined || v === null ? "" : String(v));' "$json" "$path"
}

wait_http_ok() {
  local url="$1"
  local name="$2"
  local max_wait="${3:-90}"
  local waited=0

  while (( waited < max_wait )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      pass "$name reachable"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  fail "$name reachable"
  return 1
}

upsert_user_and_token() {
  local username="$1"
  local email="$2"
  local password="$3"

  local reg_payload reg_resp reg_status reg_body
  reg_payload=$(printf '{"username":"%s","email":"%s","password":"%s"}' "$username" "$email" "$password")
  reg_resp=$(request POST "$BASE_URL/api/auth/register" "" "$reg_payload")
  reg_status=$(echo "$reg_resp" | status_of)
  reg_body=$(echo "$reg_resp" | body_of)

  if [[ "$reg_status" == "201" ]]; then
    echo "$reg_body" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(d.token || "")'
    return 0
  fi

  local login_payload login_resp login_status login_body
  login_payload=$(printf '{"emailOrUsername":"%s","password":"%s"}' "$email" "$password")
  login_resp=$(request POST "$BASE_URL/api/auth/login" "" "$login_payload")
  login_status=$(echo "$login_resp" | status_of)
  login_body=$(echo "$login_resp" | body_of)

  if [[ "$login_status" == "200" ]]; then
    echo "$login_body" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(d.token || "")'
    return 0
  fi

  echo ""
}

log "Cleaning previous stack and volumes"
$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true

log "Building and starting Docker stack"
$COMPOSE up -d --build

wait_http_ok "$BASE_URL/health" "Backend health endpoint" || true
wait_http_ok "http://localhost:${FRONTEND_PORT}" "Frontend" || true

log "Running migrations and seed in backend container"
if $COMPOSE exec -T backend npm run db:migrate >/tmp/finvibe_docker_migrate.log 2>&1; then
  pass "DB migration"
else
  fail "DB migration"
fi

if $COMPOSE exec -T backend npm run db:seed >/tmp/finvibe_docker_seed.log 2>&1; then
  pass "DB seed"
else
  fail "DB seed"
fi

log "Running API and security tests"
TOKEN1=$(upsert_user_and_token "testuser1" "testuser1@example.com" "password123")
TOKEN2=$(upsert_user_and_token "testuser2" "testuser2@example.com" "password123")

if [[ -z "$TOKEN1" || -z "$TOKEN2" ]]; then
  fail "Get auth tokens for test users"
  TOKEN1=""
  TOKEN2=""
else
  pass "Get auth tokens for test users"
fi

if [[ -n "$TOKEN1" && -n "$TOKEN2" ]]; then
  CATS_RESP=$(request GET "$BASE_URL/api/categories?type=expense" "$TOKEN1")
  CATS_STATUS=$(echo "$CATS_RESP" | status_of)
  CATS_BODY=$(echo "$CATS_RESP" | body_of)
  CATEGORY_ID=$(json_get "$CATS_BODY" "0.id")

  [[ "$CATS_STATUS" == "200" && -n "$CATEGORY_ID" ]] && pass "Get categories" || fail "Get categories"

  ACC1_PAYLOAD='{"name":"Docker U1 Checking","type":"bank","balance":1000,"currency":"USD"}'
  ACC2_PAYLOAD='{"name":"Docker U2 Checking","type":"bank","balance":500,"currency":"USD"}'

  ACC1_RESP=$(request POST "$BASE_URL/api/accounts" "$TOKEN1" "$ACC1_PAYLOAD")
  ACC2_RESP=$(request POST "$BASE_URL/api/accounts" "$TOKEN2" "$ACC2_PAYLOAD")
  ACC1_STATUS=$(echo "$ACC1_RESP" | status_of)
  ACC2_STATUS=$(echo "$ACC2_RESP" | status_of)
  ACC1_BODY=$(echo "$ACC1_RESP" | body_of)
  ACC2_BODY=$(echo "$ACC2_RESP" | body_of)
  ACC1_ID=$(json_get "$ACC1_BODY" "id")
  ACC2_ID=$(json_get "$ACC2_BODY" "id")

  [[ "$ACC1_STATUS" == "201" && -n "$ACC1_ID" ]] && pass "Create account user1" || fail "Create account user1"
  [[ "$ACC2_STATUS" == "201" && -n "$ACC2_ID" ]] && pass "Create account user2" || fail "Create account user2"

  GET_ACCOUNTS_RESP=$(request GET "$BASE_URL/api/accounts" "$TOKEN1")
  [[ "$(echo "$GET_ACCOUNTS_RESP" | status_of)" == "200" ]] && pass "Get all accounts" || fail "Get all accounts"

  TODAY="$(date +%F)"
  TX_PAYLOAD=$(printf '{"date":"%s","amount":45.5,"type":"expense","description":"Docker API Test","account_id":%s,"category_id":%s}' "$TODAY" "$ACC1_ID" "$CATEGORY_ID")
  CREATE_TX_RESP=$(request POST "$BASE_URL/api/transactions" "$TOKEN1" "$TX_PAYLOAD")
  CREATE_TX_STATUS=$(echo "$CREATE_TX_RESP" | status_of)
  CREATE_TX_BODY=$(echo "$CREATE_TX_RESP" | body_of)
  TX_ID=$(json_get "$CREATE_TX_BODY" "id")
  [[ "$CREATE_TX_STATUS" == "201" && -n "$TX_ID" ]] && pass "Create transaction" || fail "Create transaction"

  START_DATE="$(date +%Y-%m-01)"
  END_DATE="$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%F)"
  BUDGET_PAYLOAD=$(printf '{"category_id":%s,"amount":300,"period":"monthly","start_date":"%s","end_date":"%s"}' "$CATEGORY_ID" "$START_DATE" "$END_DATE")
  CREATE_BUDGET_RESP=$(request POST "$BASE_URL/api/budgets" "$TOKEN1" "$BUDGET_PAYLOAD")
  CREATE_BUDGET_STATUS=$(echo "$CREATE_BUDGET_RESP" | status_of)
  CREATE_BUDGET_BODY=$(echo "$CREATE_BUDGET_RESP" | body_of)
  BUDGET_ID=$(json_get "$CREATE_BUDGET_BODY" "id")
  [[ "$CREATE_BUDGET_STATUS" == "201" && -n "$BUDGET_ID" ]] && pass "Create budget" || fail "Create budget"

  BUDGET_PROGRESS_RESP=$(request GET "$BASE_URL/api/budgets/progress" "$TOKEN1")
  [[ "$(echo "$BUDGET_PROGRESS_RESP" | status_of)" == "200" ]] && pass "Get budget progress" || fail "Get budget progress"

  SUMMARY_RESP=$(request GET "$BASE_URL/api/reports/summary" "$TOKEN1")
  [[ "$(echo "$SUMMARY_RESP" | status_of)" == "200" ]] && pass "Get financial summary report" || fail "Get financial summary report"

  USER2_PROFILE_RESP=$(request GET "$BASE_URL/api/auth/profile" "$TOKEN2")
  [[ "$(echo "$USER2_PROFILE_RESP" | status_of)" == "200" ]] && pass "Create and validate second user" || fail "Create and validate second user"

  ISO_U2_U1_ACC=$(request GET "$BASE_URL/api/accounts/$ACC1_ID" "$TOKEN2")
  ISO_U1_U2_ACC=$(request GET "$BASE_URL/api/accounts/$ACC2_ID" "$TOKEN1")
  [[ "$(echo "$ISO_U2_U1_ACC" | status_of)" == "404" ]] && pass "User2 blocked from user1 account" || fail "User2 blocked from user1 account"
  [[ "$(echo "$ISO_U1_U2_ACC" | status_of)" == "404" ]] && pass "User1 blocked from user2 account" || fail "User1 blocked from user2 account"

  NO_TOKEN_RESP=$(request GET "$BASE_URL/api/accounts")
  BAD_TOKEN_RESP=$(request GET "$BASE_URL/api/accounts" "this.is.invalid.token")
  [[ "$(echo "$NO_TOKEN_RESP" | status_of)" == "401" ]] && pass "Reject missing token" || fail "Reject missing token"
  [[ "$(echo "$BAD_TOKEN_RESP" | status_of)" == "401" ]] && pass "Reject invalid token" || fail "Reject invalid token"

  OTHER_TX_RESP=$(request GET "$BASE_URL/api/transactions/$TX_ID" "$TOKEN2")
  OTHER_BUDGET_RESP=$(request GET "$BASE_URL/api/budgets/$BUDGET_ID" "$TOKEN2")
  [[ "$(echo "$OTHER_TX_RESP" | status_of)" == "404" ]] && pass "User2 blocked from user1 transaction" || fail "User2 blocked from user1 transaction"
  [[ "$(echo "$OTHER_BUDGET_RESP" | status_of)" == "404" ]] && pass "User2 blocked from user1 budget" || fail "User2 blocked from user1 budget"

  PRE_RESTART_COUNT=$(echo "$GET_ACCOUNTS_RESP" | body_of | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(Array.isArray(d) ? d.length : 0));')

  log "Restarting containers for persistence check"
  $COMPOSE restart postgres backend frontend >/dev/null
  wait_http_ok "$BASE_URL/health" "Backend after restart" || true

  TOKEN1_AFTER=$(upsert_user_and_token "testuser1" "testuser1@example.com" "password123")
  POST_RESTART_RESP=$(request GET "$BASE_URL/api/accounts" "$TOKEN1_AFTER")
  POST_RESTART_STATUS=$(echo "$POST_RESTART_RESP" | status_of)
  POST_RESTART_COUNT=$(echo "$POST_RESTART_RESP" | body_of | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); process.stdout.write(String(Array.isArray(d) ? d.length : 0));')

  if [[ "$POST_RESTART_STATUS" == "200" && "$POST_RESTART_COUNT" -ge "$PRE_RESTART_COUNT" ]]; then
    pass "Data persistence across restart"
  else
    fail "Data persistence across restart"
  fi
fi

echo ""
echo "===== Docker Test Summary ====="
for c in "${CHECKS[@]}"; do
  echo "$c"
done

echo ""
if [[ ${#FAILURES[@]} -eq 0 ]]; then
  echo "Overall result: PASS"
  exit 0
fi

echo "Overall result: FAIL"
echo "Failures:"
for f in "${FAILURES[@]}"; do
  echo "- $f"
done

echo ""
echo "Debug logs:"
echo "- /tmp/finvibe_docker_migrate.log"
echo "- /tmp/finvibe_docker_seed.log"
echo "- docker compose logs backend postgres frontend"
exit 1
