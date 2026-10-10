#!/bin/sh
set -e

# Heroku's addon hands out postgres://; Prisma wants postgresql://
# TLS is handled by the app (db.ts passes ssl: rejectUnauthorized:false);
# putting sslmode=require in the URL would force full cert verification, which
# node-postgres can't do against Heroku's RDS certs.
DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed 's|^postgres://|postgresql://|')
export DATABASE_URL

# chat-service on an internal-only port (not routed by Heroku)
cd /app/chat-service
uv run --no-sync uvicorn app:app --host 127.0.0.1 --port 8001 &

# API + static client; Heroku injects $PORT
cd /app/server
npx prisma migrate deploy
exec npx tsx index.ts
