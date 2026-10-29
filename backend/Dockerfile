FROM node:26.12.1-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# npm and corepack are only needed to install; drop them from the runtime image.
RUN apk upgrade --no-cache && npm ci --omit=dev --ignore-scripts \
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
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "node migrate.js && exec node server.js"]
