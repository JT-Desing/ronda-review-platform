FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY *.js ./
COPY modules ./modules
COPY repositories ./repositories
COPY migrations ./migrations
RUN mkdir -p /data/files && chown node:node /data/files
USER node
EXPOSE 3000
CMD ["sh", "-c", "node migrate.js && exec node server.js"]
