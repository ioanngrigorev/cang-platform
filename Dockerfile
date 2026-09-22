# syntax=docker/dockerfile:1.7
#
# CANG — multi-stage image.
#   deps       install all dependencies (needed for `next build`)
#   build      next build → .next/standalone (output: "standalone" in next.config.ts)
#   prod-deps  production node_modules + tsx, used only to run drizzle migrations at start
#   runner     node:20-alpine, non-root, runs deploy/entrypoint.sh → migrations → node server.js
#
# Build:  docker build -t cang:local --build-arg NEXT_PUBLIC_APP_URL=https://cang.vn .
# NEXT_PUBLIC_* values are inlined into client bundles at build time, so pass them as build args.

ARG NODE_VERSION=20

# ---------- deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
ARG NEXT_PUBLIC_APP_URL=https://cang.vn
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
COPY . .
# env() is only evaluated at request time; a placeholder keeps any build-time import from throwing.
RUN SESSION_SECRET=build-time-placeholder-secret-not-used-at-runtime \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    pnpm build

# ---------- prod-deps ----------
# Production dependencies only (drizzle-orm, pg, dotenv, ...) plus tsx so the entrypoint can run
# src/db/migrate.ts without a compile step. tsx is a devDependency in package.json, hence the explicit add.
FROM node:${NODE_VERSION}-alpine AS prod-deps
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile && pnpm add tsx@4.23.15

# ---------- runner ----------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache postgresql16-client tini \
 && addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next standalone server (includes a traced minimal node_modules and server.js)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Migration/seed toolchain: SQL migrations, the TypeScript sources (src/db/migrate.ts, src/db/seed/*, and the
# modules they import), tsconfig.json (tsx resolves the "@/*" alias from it) and the production node_modules
# (a superset of the traced one inside .next/standalone).
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/src ./src
COPY --from=build --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./deploy/entrypoint.sh && mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000
VOLUME ["/app/storage/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/deploy/entrypoint.sh"]
