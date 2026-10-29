FROM node:26.12.1-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# npm and corepack are only needed to install; drop them from the runtime image.
RUN apk upgrade --no-cache && npm ci --omit=dev \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY *.js ./
COPY ronda-logo-v3.png ./
COPY modules ./modules
COPY repositories ./repositories
COPY migrations ./migrations
COPY storage ./storage
RUN mkdir -p /data/files && chown node:node /data/files
USER node
EXPOSE 3000
CMD ["sh", "-c", "node migrate.js && exec node server.js"]
