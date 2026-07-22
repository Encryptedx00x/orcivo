# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV HUSKY=0

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json

RUN pnpm install --frozen-lockfile --filter @orcivo/web...

COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
COPY apps/backend/src/quote/fonts ./apps/backend/src/quote/fonts
RUN mkdir -p apps/web/public

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @orcivo/shared-types build
RUN pnpm --filter @orcivo/web build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
