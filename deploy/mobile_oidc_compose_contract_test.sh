#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

for compose_file in docker-compose.yml docker-compose.remote-db.yml; do
  grep -Fq 'AICODEX_IOS_OIDC_CLIENT_ENABLED:' "${SCRIPT_DIR}/${compose_file}" \
    || fail "${compose_file} does not pass the fixed iOS OIDC client enablement"
  grep -Fq 'AICODEX_IOS_OIDC_REDIRECT_URIS:' "${SCRIPT_DIR}/${compose_file}" \
    || fail "${compose_file} does not pass the fixed iOS redirect contract"
done

grep -Fq 'AICODEX_IOS_OIDC_CLIENT_ENABLED=true' "${SCRIPT_DIR}/.env.ex" \
  || fail '.env.ex does not document explicit iOS OIDC enablement'

printf 'PASS: Admin deployment provisions the fixed iOS OIDC public-client contract\n'
