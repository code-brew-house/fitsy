FROM node:20-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# Build shared first (its dist/index.js is required by the API at compile and runtime)
RUN pnpm --filter=@fitsy/shared run build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter=@fitsy/api run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Preserve workspace structure so pnpm symlinks resolve correctly.
# prisma CLI lives in root node_modules (hoisted by pnpm); apps/api/node_modules
# contains the workspace-local symlinks including @prisma/client.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
# shared dist is required at runtime — pnpm symlink in node_modules points here
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
