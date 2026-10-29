# syntax=docker/dockerfile:1
# The API image. Build from the repository root (npm workspaces):
#   docker build -f apps/api/Dockerfile .
# The same image runs the API (default command) and the one-shot database
# setup (`node dist/setup.js`).

ARG NODE_IMAGE=node:24-alpine

# Every workspace's package.json plus the lockfile: enough for `npm ci`.
FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/

# All dependencies of the API workspace, to build it.
FROM manifests AS build
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @sitter/api
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN npm run build --workspace @sitter/api

# Only the runtime dependencies (no TypeScript, tsup, test tools).
FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @sitter/api --omit=dev

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    MIGRATIONS_DIR=/app/drizzle
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# package.json marks dist/*.js as ES modules ("type": "module").
COPY --chown=node:node apps/api/package.json ./package.json
COPY --chown=node:node apps/api/drizzle ./drizzle
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
# The official image's unprivileged user.
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/health/live').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
# Exec form: SIGTERM from `docker stop` reaches Node (and the graceful shutdown).
CMD ["node", "dist/server.js"]
