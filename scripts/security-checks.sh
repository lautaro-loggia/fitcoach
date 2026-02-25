#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0

section() {
  printf "\n[%s] %s\n" "$1" "$2"
}

section "1/4" "Checking server actions that use createAdminClient without auth.getUser"
SERVER_ACTION_VIOLATIONS="$(rg -l "'use server'" src/app src/actions | while IFS= read -r file; do
  if rg -q "createAdminClient\\(" "$file" && ! rg -q "auth\\.getUser\\(" "$file"; then
    echo "$file"
  fi
done)"

if [[ -n "$SERVER_ACTION_VIOLATIONS" ]]; then
  echo "Found server actions with admin client and no explicit auth guard:"
  echo "$SERVER_ACTION_VIOLATIONS"
  FAIL=1
else
  echo "OK"
fi

section "2/4" "Checking duplicated migration versions"
DUPLICATE_VERSIONS="$(find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print \
  | xargs -n1 basename \
  | awk -F'_' '/^[0-9]{8,14}_.+\\.sql$/ {print $1}' \
  | sort \
  | uniq -d)"

if [[ -n "$DUPLICATE_VERSIONS" ]]; then
  echo "Found duplicated migration version prefixes:"
  echo "$DUPLICATE_VERSIONS"
  FAIL=1
else
  echo "OK"
fi

section "3/4" "Checking permissive RLS patterns in recent migrations"
RLS_FAIL=0
for file in $(find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print | sort); do
  base="$(basename "$file")"
  version="${base%%_*}"

  if [[ "$version" =~ ^[0-9]{8,14}$ ]] && [[ "$version" -ge 20260223143000 ]]; then
    if rg -n "^[[:space:]]*(USING \\(true\\)|WITH CHECK \\(true\\))" "$file" >/dev/null; then
      echo "Permissive RLS pattern found in $base"
      rg -n "^[[:space:]]*(USING \\(true\\)|WITH CHECK \\(true\\))" "$file"
      RLS_FAIL=1
    fi
  fi
done

if [[ "$RLS_FAIL" -eq 1 ]]; then
  FAIL=1
else
  echo "OK"
fi

section "4/4" "Checking hardcoded admin identifiers (warning-only)"
if rg -n "ADMIN_EMAILS|d172f729-a64c-451b-ab41-4d0ce916acf4" src supabase >/dev/null; then
  echo "Warning: hardcoded admin identifiers detected:"
  rg -n "ADMIN_EMAILS|d172f729-a64c-451b-ab41-4d0ce916acf4" src supabase
else
  echo "OK"
fi

if [[ "$FAIL" -eq 1 ]]; then
  printf "\nSecurity checks failed.\n"
  exit 1
fi

printf "\nSecurity checks passed.\n"
