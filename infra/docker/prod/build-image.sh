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

# CI는 디스크 캐시를 복원해 전달하고, 로컬은 기본 BuildKit 캐시를 사용합니다.
if [[ -n "${BUILD_CACHE_DIR:-}" ]]; then
  if [[ -f "$BUILD_CACHE_DIR/index.json" ]]; then
    build_options+=(--cache-from "type=local,src=$BUILD_CACHE_DIR")
  fi
  build_options+=(--cache-to "type=local,dest=$BUILD_CACHE_DIR,mode=max")
fi

# 플랫폼 등 추가 옵션은 호출자가 전달할 수 있습니다.
docker buildx build \
  "${build_options[@]}" \
  "$@" \
  "$repo_root"
