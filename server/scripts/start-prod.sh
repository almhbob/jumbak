#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[start] DATABASE_URL found — running migrations..."
  # Retry migrations up to 5 times (database may still be starting)
  attempt=0
  until npx prisma migrate deploy; do
    attempt=$((attempt + 1))
    if [ $attempt -ge 5 ]; then
      echo "[start] Migration failed after 5 attempts — aborting"
      exit 1
    fi
    echo "[start] Migration attempt $attempt failed, retrying in 5s..."
    sleep 5
  done
  echo "[start] Running seed..."
  npx tsx prisma/seed.ts || echo "[start] Seed skipped (data may already exist)"
else
  echo "[start] No DATABASE_URL — starting in in-memory mode"
fi

echo "[start] Starting Jnbk API..."
exec node dist/main.js
