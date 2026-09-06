#!/usr/bin/env bash
set -euo pipefail

IMAGE="dan4kl/game"
WS_IMAGE="dan4kl/game-ws"

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

echo "==> Build $WS_IMAGE:latest"
docker build -t "$WS_IMAGE:latest" ./server

echo "==> Push $WS_IMAGE:latest"
docker push "$WS_IMAGE:latest"

echo "==> Done: $IMAGE:latest + $WS_IMAGE:latest (version $VERSION)"
echo "==> Pe server: docker compose pull && docker compose up -d (serviciul game-ws e nou in docker-compose.yml)"
