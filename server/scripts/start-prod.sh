#!/bin/sh

if [ -n "$DATABASE_URL" ]; then
  echo "[start] DATABASE_URL found — running migrations..."
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
