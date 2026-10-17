# All-in-one production image for Heroku: static client + API.
# Build context is the repo root. No .env/.pem can enter (see .dockerignore).

# ---- client: build static dist ----
FROM node:20-bookworm AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- final image: node ----
FROM node:20-bookworm
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# server
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate

# built client (served same-origin by express)
COPY --from=client /app/client/dist /app/client/dist

COPY docker-entrypoint.prod.sh /app/docker-entrypoint.prod.sh
RUN chmod +x /app/docker-entrypoint.prod.sh

ENV NODE_ENV=production \
    CLIENT_DIST=/app/client/dist

CMD ["/app/docker-entrypoint.prod.sh"]
