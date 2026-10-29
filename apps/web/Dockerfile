# syntax=docker/dockerfile:1
# The web image: the Next.js app exported as static files, served by nginx,
# which also proxies /api/* to the API. Build from the repository root:
#   docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace @sitter/web
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @sitter/web

# nginx as an unprivileged user, listening on 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
