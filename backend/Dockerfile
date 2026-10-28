FROM node:24.22.1-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
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
