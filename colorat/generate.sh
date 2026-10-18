#!/usr/bin/env bash
# Genereaza planșele SVG (colorat/data/pages) si colorat/data/catalog.json, in Docker.
set -euo pipefail
cd "$(dirname "$0")"
docker build -q -t coloring-tools -f gen/Dockerfile.tools gen >/dev/null
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/c -w /c/gen coloring-tools python gen.py
