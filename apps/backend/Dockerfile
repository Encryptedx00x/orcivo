# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copiar arquivos de dependências do monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY tsconfig.base.json ./

# Instalar dependências
RUN pnpm install --frozen-lockfile --filter @orcivo/backend...

# Copiar código fonte
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

# Build
RUN pnpm --filter @orcivo/backend build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile --filter @orcivo/backend... --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared-types/src ./packages/shared-types/src

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "apps/backend/dist/main"]
