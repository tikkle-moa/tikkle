FROM node:22-alpine

WORKDIR /app

COPY apps/client/package.json apps/client/pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY apps/client ./

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]