FROM node:26.13.0-alpine AS build

# Node 26 no longer ships corepack; install the pinned pnpm from packageManager.
RUN npm install -g pnpm@11.28.3
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM docker.io/nginxinc/nginx-unprivileged:1.31-alpine

USER root
# Changes daily in CI so a cached layer cannot keep fixed Alpine CVEs.
ARG APK_REFRESH
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
