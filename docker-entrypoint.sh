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
# AUTH_URL decides the cookie flavour (http → plain cookies, https → __Secure- cookies). A localhost value copied from
# .env.example breaks login behind the HTTPS proxy, so it is replaced by the platform's public domain when one is known.
case "$AUTH_URL" in
  http://localhost*|http://127.*|http://0.0.0.0*) log "AUTH_URL=$AUTH_URL is a local address — ignoring it in production"; unset AUTH_URL ;;
esac
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
    node ./dist/migrate-fallback.cjs ./prisma/migrations >> "$LOG" 2>&1 && MIGRATED=1
    if [ "$MIGRATED" = "1" ]; then
      log "migrations applied"
      if [ "${SKIP_SEED:-0}" != "1" ]; then
        log "seeding reference data and users"
        node ./dist/seed.cjs >> "$LOG" 2>&1 && log "seed done" || log "seed FAILED (see log above)"
      fi
      DEFAULT_WB="./data/Acompanhamento do Pipe_20260817.xlsx"
      WB="${PIPELINE_WORKBOOK:-$DEFAULT_WB}"
      if [ -n "$PIPELINE_WORKBOOK" ] && [ ! -f "$WB" ]; then
        log "PIPELINE_WORKBOOK does not point to a file — using the bundled workbook instead"
        WB="$DEFAULT_WB"
      fi
      if [ "${IMPORT_ON_BOOT:-1}" = "1" ] && [ -f "$WB" ]; then
        log "importing workbook (idempotent): $WB"
        node ./dist/import-pipeline.cjs "$WB" >> "$LOG" 2>&1 && log "import done" || log "import FAILED (see log above)"
      else
        log "import skipped (IMPORT_ON_BOOT=${IMPORT_ON_BOOT:-1}, workbook '$WB' exists: $([ -f "$WB" ] && echo yes || echo no))"
        ls -la ./data >> "$LOG" 2>&1 || log "no ./data directory in the image"
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
