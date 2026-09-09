#!/usr/bin/env bash
set -euo pipefail

# pnpm docker:build:client/server에서 호출하는 로컬 이미지 빌드 스크립트입니다.
# CI/CD는 이 스크립트 대신 Docker Actions로 빌드하며, 운영 Dockerfile만 공유합니다.
app="${1:-}"
case "$app" in
  client|server) shift ;;
  *) echo "Usage: bash infra/docker/prod/build-image.sh <client|server> [buildx options...]" >&2; exit 2 ;;
esac

# 실행 위치와 관계없이 저장소 루트를 빌드 컨텍스트로 사용합니다.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
image="${IMAGE_PREFIX:-tikkle}/${app}:${IMAGE_TAG:-local}"
# 빌드한 이미지를 로컬 Docker에 로드합니다. 기본 BuildKit 캐시를 사용합니다.
build_options=(--load --file "$repo_root/infra/docker/prod/${app}.Dockerfile" --tag "$image")

# 플랫폼 등 추가 옵션은 호출자가 전달할 수 있습니다.
docker buildx build \
  "${build_options[@]}" \
  "$@" \
  "$repo_root"
