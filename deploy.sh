#!/usr/bin/env bash
set -euo pipefail

IMAGE="dan4kl/game"

cd "$(dirname "$0")"

# fara argument: versiunea se calculeaza (data + hash git). Cu argument
# explicit, exact ce s-a scris in prompt devine window.APP_VERSION din
# version.js (afisat in footer, util ca sa recunosti ce build ruleaza).
# Pe Docker Hub se impinge intotdeauna doar tag-ul "latest", ca sa fie
# singurul pe care il trage docker-compose.yml de pe server.
VERSION="${1:-$(date -u +%Y%m%d-%H%M)-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"

echo "==> Version $VERSION"
echo "window.APP_VERSION = '$VERSION';" > version.js
sed "s/__VERSION__/$VERSION/g" nginx.conf.template > nginx.conf

echo "==> Build $IMAGE:latest"
docker build -t "$IMAGE:latest" .

echo "==> Push $IMAGE:latest"
docker push "$IMAGE:latest"

echo "==> Done: $IMAGE:latest (version $VERSION)"
