# ───────────────────────────────────────────────────────────────
# PokeItem API — production image
#
# Multi-stage build:
#   1. `deps`    : install all deps (dev + prod) — cached when
#                  package.json doesn't change.
#   2. `builder` : generate Prisma client + compile TypeScript.
#   3. `runner`  : slim runtime image with just prod deps and the
#                  compiled `dist/` folder.
# ───────────────────────────────────────────────────────────────

# ─── 1. deps ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci

# ─── 2. builder ────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ─── 3. runner ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl dumb-init

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs api

# Copy runtime artifacts only
COPY --from=builder --chown=api:nodejs /app/dist            ./dist
COPY --from=builder --chown=api:nodejs /app/node_modules    ./node_modules
COPY --from=builder --chown=api:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=api:nodejs /app/package.json    ./package.json

USER api
EXPOSE 3001

# dumb-init handles PID 1 signals (SIGTERM → graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
