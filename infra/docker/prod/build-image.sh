#!/usr/bin/env bash
set -euo pipefail

# CI와 로컬에서 동일한 Dockerfile 및 빌드 명령을 사용합니다.
app="${1:-}"
case "$app" in
  client|server) shift ;;
  *) echo "Usage: bash infra/docker/prod/build-image.sh <client|server> [buildx options...]" >&2; exit 2 ;;
esac

# 실행 위치와 관계없이 저장소 루트를 빌드 컨텍스트로 사용합니다.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
image="${IMAGE_PREFIX:-tikkle}/${app}:${IMAGE_TAG:-local}"
build_options=(--load --file "$repo_root/infra/docker/prod/${app}.Dockerfile" --tag "$image")

# 플랫폼 등 추가 옵션은 호출자가 전달할 수 있습니다.
docker buildx build \
  "${build_options[@]}" \
  "$@" \
  "$repo_root"
