#!/bin/sh
# Boot: check env → migrate → start the web server (port opens immediately) → seed + import in the background.
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
if [ -z "$APP_PASSWORD" ] && [ -z "$SEED_DEFAULT_PASSWORD" ]; then
  echo "[leto] ERROR: set APP_PASSWORD (single strong team password for the login screen) or SEED_DEFAULT_PASSWORD (per-user passwords)." >&2
  exit 1
fi
if [ -n "$APP_PASSWORD" ]; then echo "[leto] access mode: shared team password (APP_PASSWORD)"; fi
if [ -z "$AUTH_URL" ] && [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then export AUTH_URL="https://$RAILWAY_PUBLIC_DOMAIN"; fi
if [ -z "$AUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then export AUTH_URL="$RENDER_EXTERNAL_URL"; fi

echo "[leto] applying migrations"
node ./node_modules/prisma/build/index.js migrate deploy

echo "[leto] starting web server on port ${PORT:-3000}"
node server.js &
SERVER_PID=$!

(
  if [ "${SKIP_SEED:-0}" != "1" ]; then
    echo "[leto] seeding reference data and users"
    node ./dist/seed.cjs || echo "[leto] seed failed"
  fi
  WB="${PIPELINE_WORKBOOK:-./data/Acompanhamento do Pipe_20260817.xlsx}"
  if [ "${IMPORT_ON_BOOT:-1}" = "1" ] && [ -f "$WB" ]; then
    echo "[leto] importing workbook (idempotent): $WB"
    node ./dist/import-pipeline.cjs "$WB" || echo "[leto] import failed"
  fi
  echo "[leto] bootstrap finished"
) &

wait $SERVER_PID
