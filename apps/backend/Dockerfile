# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV HUSKY=0

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN pnpm install --frozen-lockfile --filter @orcivo/backend...

COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

RUN pnpm --filter @orcivo/shared-types build
RUN DATABASE_URL=postgresql://invalid:invalid@127.0.0.1:1/orcivo_generate_only \
  pnpm --filter @orcivo/backend exec prisma generate --schema ../../prisma/schema.prisma
RUN pnpm --filter @orcivo/backend build
RUN pnpm --filter @orcivo/backend deploy --prod .deploy/backend
RUN mkdir -p /app/.deploy/backend/prisma \
  && cp /app/prisma/schema.prisma /app/.deploy/backend/prisma/schema.prisma \
  && DATABASE_URL=postgresql://invalid:invalid@127.0.0.1:1/orcivo_generate_only \
    pnpm --filter @orcivo/backend exec prisma generate \
      --schema /app/.deploy/backend/prisma/schema.prisma \
  && rm -rf /app/.deploy/backend/prisma \
  && cd /app/.deploy/backend \
  && node -e "require('@prisma/client'); require('@orcivo/shared-types')"

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
COPY --from=build --chown=node:node /app/.deploy/backend ./

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
