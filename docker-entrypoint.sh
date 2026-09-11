#!/bin/sh
# Applies migrations, seeds reference data/users and (on first boot) imports the workbook, then starts the server.
set -e
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
