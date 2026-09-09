FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY packages/api-types/package.json ./packages/api-types/package.json

RUN pnpm install --frozen-lockfile --filter client...

COPY apps/client ./apps/client
COPY packages/api-types ./packages/api-types

CMD ["pnpm", "-F", "client", "test:e2e"]