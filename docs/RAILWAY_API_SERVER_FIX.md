# Railway API Server Fix for Jnbk

Current symptom:

```text
Cannot GET /health
```

This means the public Railway domain is live, but the deployed service is not running the Jnbk backend entrypoint that defines `/health`.

## Correct service

Use the Railway service named:

```text
@workspace/api-server
```

## Correct GitHub source

The service must point to:

```text
Repository: almhbob/jumbak
Branch: main
```

## Correct build and start commands

Set these in Railway service settings.

Build command:

```bash
pnpm install --frozen-lockfile=false && pnpm --filter @jumbak/server build
```

Start command:

```bash
pnpm --filter @jumbak/server start:prod
```

Healthcheck path:

```text
/health
```

## Required variables

```text
DATABASE_URL
JWT_SECRET
NODE_ENV=production
PORT=4000
```

## Correct public API URL

```text
https://workspaceapi-server-production-3e22.up.railway.app
```

## Expected health response

Open:

```text
https://workspaceapi-server-production-3e22.up.railway.app/health
```

Expected JSON:

```json
{
  "ok": true,
  "app": "Jnbk",
  "appAr": "جنبك",
  "region": "global-ready"
}
```

## After Railway is fixed

Set the same API URL in:

```text
Vercel: NEXT_PUBLIC_API_URL
Expo/EAS: EXPO_PUBLIC_API_URL
```
