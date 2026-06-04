#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[start] DATABASE_URL found — running migrations..."
  npx prisma migrate deploy
  echo "[start] Running seed..."
  npx tsx prisma/seed.ts || echo "[start] Seed skipped (data may already exist)"
else
  echo "[start] No DATABASE_URL — starting in in-memory mode"
fi

echo "[start] Starting Jnbk API..."
exec node dist/main.js
