#!/usr/bin/env bash
# Development helper: drops and recreates the local database, applies migrations, seeds and imports.
set -euo pipefail
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/leto_pipeline}"
DB_NAME="${DB_URL##*/}"; DB_NAME="${DB_NAME%%\?*}"
ADMIN_URL="${DB_URL%/*}/postgres"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" -c "CREATE DATABASE \"$DB_NAME\";"
npx prisma migrate deploy
npm run db:seed
npm run import:pipeline
