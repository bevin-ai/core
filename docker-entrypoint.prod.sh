#!/bin/sh
set -e

# Heroku's addon hands out postgres://; Prisma wants postgresql://
# TLS is handled by the app (db.ts passes ssl: rejectUnauthorized:false);
# putting sslmode=require in the URL would force full cert verification, which
# node-postgres can't do against Heroku's RDS certs.
DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed 's|^postgres://|postgresql://|')
export DATABASE_URL

# API + static client; Heroku injects $PORT
cd /app/server
npx prisma migrate deploy
exec npx tsx index.ts
