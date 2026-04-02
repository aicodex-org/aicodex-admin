#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)

IMAGE_NAME=${1:-aicodex-admin}
IMAGE_TAG=${2:-latest}

docker build \
  -f "${SCRIPT_DIR}/Dockerfile" \
  --target standard \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  "${ROOT_DIR}"
