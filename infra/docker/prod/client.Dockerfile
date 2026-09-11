FROM node:22-alpine AS build

WORKDIR /app

# Toss 클라이언트 키는 Vite 빌드 시점에 정적으로 주입됩니다.
# 기본값은 실결제가 발생하지 않는 개발·검증 환경용 테스트 키이며, 운영 키는 build-arg로 덮어쓸 수 있습니다.
ARG VITE_TOSS_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
ENV VITE_TOSS_CLIENT_KEY=${VITE_TOSS_CLIENT_KEY}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json

RUN corepack enable && pnpm install --frozen-lockfile --filter client... --ignore-scripts

COPY apps/client ./apps/client
COPY packages/api-types ./packages/api-types

RUN pnpm build:client

FROM nginx:stable-alpine

COPY infra/docker/prod/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80 443
