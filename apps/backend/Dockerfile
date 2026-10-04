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
COPY prisma/migrations ./prisma/migrations
COPY prisma/seed.ts ./prisma/seed.ts

RUN pnpm install --frozen-lockfile --filter @orcivo/backend...

COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

RUN pnpm --filter @orcivo/shared-types build
RUN pnpm install --offline --frozen-lockfile --filter @orcivo/backend...
RUN DATABASE_URL=postgresql://invalid:invalid@127.0.0.1:1/orcivo_generate_only \
  pnpm --filter @orcivo/backend exec prisma generate --schema ../../prisma/schema.prisma
RUN pnpm --filter @orcivo/backend build
RUN pnpm --filter @orcivo/backend --prod deploy /app/.deploy/backend
RUN root_client="$(readlink -f /app/apps/backend/node_modules/@prisma/client)" \
  && deploy_client="$(readlink -f /app/.deploy/backend/node_modules/@prisma/client)" \
  && root_generated="$(dirname "$(dirname "$root_client")")/.prisma" \
  && deploy_generated="$(dirname "$(dirname "$deploy_client")")/.prisma" \
  && test -f "$root_generated/client/default.js" \
  && mkdir -p "$deploy_generated" \
  && cp -a "$root_generated/." "$deploy_generated/" \
  && cp -a /app/.deploy/backend /tmp/backend-runtime \
  && cd /tmp/backend-runtime \
  && node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient(); require('@orcivo/shared-types'); require('./dist/app.module.js')" \
  && rm -rf /tmp/backend-runtime

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
COPY --from=build --chown=node:node /app/.deploy/backend ./

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
