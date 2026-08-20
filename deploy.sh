#!/usr/bin/env bash
set -euo pipefail

IMAGE="dan4kl/game"
TAG="${1:-latest}"

cd "$(dirname "$0")"

VERSION="$(date -u +%Y%m%d-%H%M)-$(git rev-parse --short HEAD 2>/dev/null || echo local)"
echo "==> Version $VERSION"
echo "window.APP_VERSION = '$VERSION';" > version.js

echo "==> Build $IMAGE:$TAG"
docker build -t "$IMAGE:$TAG" .

echo "==> Push $IMAGE:$TAG"
docker push "$IMAGE:$TAG"

echo "==> Done: $IMAGE:$TAG"
