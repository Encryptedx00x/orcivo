# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV HUSKY=0

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/site/package.json ./apps/site/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json

RUN pnpm install --frozen-lockfile --filter @orcivo/site...

COPY packages/shared-types ./packages/shared-types
RUN pnpm --filter @orcivo/shared-types build
RUN pnpm install --offline --frozen-lockfile --filter @orcivo/site...

COPY apps/site ./apps/site
COPY apps/backend/src/quote/fonts ./apps/backend/src/quote/fonts
RUN mkdir -p apps/site/public

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @orcivo/site build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/site/public ./apps/site/public

USER nextjs
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/site/server.js"]
