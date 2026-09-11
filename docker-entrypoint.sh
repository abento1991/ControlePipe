#!/bin/sh
# Boot order: env checks → start web server immediately (port 3000 opens in ~1s) → migrate + seed + import in background.
# Progress is appended to bootstrap.log and exposed at /api/health for remote diagnosis.
LOG=/app/bootstrap.log
: > "$LOG"
log() { echo "[leto] $*" | tee -a "$LOG"; }

# The public domain targets port 3000; listen there on IPv4+IPv6 (Railway proxies over IPv6).
export PORT=3000
export HOSTNAME="::"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"
if [ -z "$AUTH_URL" ] && [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then export AUTH_URL="https://$RAILWAY_PUBLIC_DOMAIN"; fi
if [ -z "$AUTH_URL" ] && [ -n "$RENDER_EXTERNAL_URL" ]; then export AUTH_URL="$RENDER_EXTERNAL_URL"; fi

MISSING=""
[ -z "$DATABASE_URL" ] && MISSING="$MISSING DATABASE_URL"
[ -z "$AUTH_SECRET" ] && MISSING="$MISSING AUTH_SECRET"
[ -z "$APP_PASSWORD" ] && [ -z "$SEED_DEFAULT_PASSWORD" ] && MISSING="$MISSING APP_PASSWORD"
if [ -n "$MISSING" ]; then
  log "ERROR: missing environment variables:$MISSING (Railway: Variables tab; DATABASE_URL = \${{Postgres.DATABASE_URL}})"
fi
# Fail fast instead of hanging when the database host is unreachable (e.g. another project's private network).
case "$DATABASE_URL" in
  *connect_timeout=*) ;;
  *\?*) export DATABASE_URL="${DATABASE_URL}&connect_timeout=15" ;;
  "") ;;
  *) export DATABASE_URL="${DATABASE_URL}?connect_timeout=15" ;;
esac
[ -n "$APP_PASSWORD" ] && log "access mode: shared team password (APP_PASSWORD)"
log "starting web server on port $PORT (AUTH_URL=${AUTH_URL:-unset})"
node server.js &
SERVER_PID=$!

if [ -z "$MISSING" ]; then
  (
    log "applying migrations"
    MIGRATED=0
    if node ./node_modules/prisma/build/index.js migrate deploy >> "$LOG" 2>&1; then
      MIGRATED=1
    else
      log "prisma CLI failed; applying migrations with the built-in fallback"
      node ./dist/migrate-fallback.cjs ./prisma/migrations >> "$LOG" 2>&1 && MIGRATED=1
    fi
    if [ "$MIGRATED" = "1" ]; then
      log "migrations applied"
      if [ "${SKIP_SEED:-0}" != "1" ]; then
        log "seeding reference data and users"
        node ./dist/seed.cjs >> "$LOG" 2>&1 && log "seed done" || log "seed FAILED (see log above)"
      fi
      WB="${PIPELINE_WORKBOOK:-./data/Acompanhamento do Pipe_20260817.xlsx}"
      if [ "${IMPORT_ON_BOOT:-1}" = "1" ] && [ -f "$WB" ]; then
        log "importing workbook (idempotent): $WB"
        node ./dist/import-pipeline.cjs "$WB" >> "$LOG" 2>&1 && log "import done" || log "import FAILED (see log above)"
      fi
    else
      log "migrations FAILED — check DATABASE_URL (host reachable? credentials?)"
    fi
    log "bootstrap finished"
  ) &
else
  log "bootstrap skipped until the variables above are set"
fi

wait $SERVER_PID
