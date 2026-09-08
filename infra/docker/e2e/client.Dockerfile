FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json

RUN corepack enable && pnpm install --frozen-lockfile --filter client...

COPY apps/client ./apps/client
COPY packages/api-types ./packages/api-types

WORKDIR /app/apps/client

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]