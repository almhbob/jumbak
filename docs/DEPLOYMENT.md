# JUMBAK Deployment Guide

## Local setup

```bash
pnpm install --force
pnpm --filter @jumbak/server dev
pnpm --filter @jumbak/mobile start --clear
```

## Railway backend

1. Create a Railway project from GitHub.
2. Select `almhbob/jumbak`.
3. Add PostgreSQL.
4. Set `DATABASE_URL` from Railway variables.
5. Deploy.

## Database

After setting `DATABASE_URL`:

```bash
pnpm --filter @jumbak/server prisma:generate
pnpm --filter @jumbak/server prisma:migrate
pnpm --filter @jumbak/server seed
```

## Health check

```bash
curl https://YOUR-RAILWAY-DOMAIN/health
```

Expected:

```json
{"ok":true,"app":"JUMBAK"}
```

## Android preview APK

```bash
cd apps/mobile
npx eas build -p android --profile preview
```
