#!/bin/sh

if [ -n "$DATABASE_URL" ]; then
  echo "[start] DATABASE_URL found — running migrations..."

  # The init migration (00000000000000_init) contains all schema including columns
  # added by subsequent ALTER TABLE migrations. Mark those as applied so Prisma
  # doesn't try to run them again after the init creates the full schema.
  for migration in \
    20260526000001_add_zone_category \
    20260529000001_add_driver_application \
    20260529000002_add_ride_stops \
    20260529000003_add_wallet; do
    npx prisma migrate resolve --applied "$migration" 2>/dev/null && \
      echo "[start] Marked $migration as applied" || true
  done

  attempt=0
  while [ $attempt -lt 5 ]; do
    if npx prisma migrate deploy; then
      echo "[start] Migrations succeeded"
      echo "[start] Running seed..."
      npx tsx prisma/seed.ts || echo "[start] Seed skipped (data may already exist)"
      break
    fi
    attempt=$((attempt + 1))
    echo "[start] Migration attempt $attempt failed, retrying in 5s..."
    sleep 5
  done
  if [ $attempt -ge 5 ]; then
    echo "[start] Migrations failed after 5 attempts — starting anyway"
  fi
else
  echo "[start] No DATABASE_URL — starting in in-memory mode"
fi

echo "[start] Starting Jnbk API..."
exec node dist/main.js
