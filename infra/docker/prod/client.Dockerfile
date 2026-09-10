FROM node:22-alpine AS build

WORKDIR /app

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
