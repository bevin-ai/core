# All-in-one production image for Heroku: static client + API + chat-service.
# Build context is the repo root. No .env/.pem can enter (see .dockerignore).

# ---- client: build static dist ----
FROM node:20-bookworm AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- final image: node + python (chat-service via uv) ----
FROM node:20-bookworm
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# chat-service
WORKDIR /app/chat-service
COPY chat-service/pyproject.toml chat-service/uv.lock ./
RUN uv sync --frozen --no-install-project
COPY chat-service/ ./

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
    CLIENT_DIST=/app/client/dist \
    CHAT_SERVICE_URL=http://127.0.0.1:8001

EXPOSE 8001
CMD ["/app/docker-entrypoint.prod.sh"]
