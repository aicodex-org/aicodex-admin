#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)

IMAGE_NAME=${1:-aicodex-admin}
IMAGE_TAG=${2:-latest}
VERIFY_FILE="WW_verify_iqXz8cc49VDcBNB0.txt"
VERIFY_PATH="/web/build/${VERIFY_FILE}"
VERIFY_CONTENT="iqXz8cc49VDcBNB0"

docker build \
  --no-cache \
  -f "${SCRIPT_DIR}/Dockerfile" \
  --target standard \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  "${ROOT_DIR}"

echo "Verifying ${VERIFY_PATH} exists in ${IMAGE_NAME}:${IMAGE_TAG}..."
docker run --rm --entrypoint /bin/sh "${IMAGE_NAME}:${IMAGE_TAG}" -c \
  "actual=\$(cat '${VERIFY_PATH}' 2>/dev/null || true); [ \"\$actual\" = '${VERIFY_CONTENT}' ] || { echo 'Missing or invalid ${VERIFY_PATH}' >&2; exit 1; }"
