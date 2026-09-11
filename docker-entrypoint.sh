#!/bin/sh
# Applies migrations, seeds reference data/users and (on first boot) imports the workbook, then starts the server.
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "[leto] ERROR: DATABASE_URL is not set. Add a PostgreSQL service and set DATABASE_URL (Railway: \${{Postgres.DATABASE_URL}})." >&2
  exit 1
fi
if [ -z "$AUTH_SECRET" ]; then
  echo "[leto] ERROR: AUTH_SECRET is not set. Generate one with: openssl rand -base64 32" >&2
  exit 1
fi
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"
if [ -z "$AUTH_URL" ] && [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then export AUTH_URL="https://$RAILWAY_PUBLIC_DOMAIN"; fi
if [ -z "$AUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then export AUTH_URL="$RENDER_EXTERNAL_URL"; fi
echo "[leto] applying migrations"
./node_modules/.bin/prisma migrate deploy
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[leto] seeding reference data"
  node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts || true
fi
if [ "${IMPORT_ON_BOOT:-1}" = "1" ] && [ -f "${PIPELINE_WORKBOOK:-./data/Acompanhamento do Pipe_20260817.xlsx}" ]; then
  echo "[leto] importing workbook (idempotent)"
  node ./node_modules/tsx/dist/cli.mjs scripts/import-pipeline.ts || echo "[leto] import failed (continuing)"
fi
echo "[leto] starting"
exec node server.js
